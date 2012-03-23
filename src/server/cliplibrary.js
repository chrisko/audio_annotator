// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// cliplibrary.js -- Clip Library Manager

var assert = require("assert"),
    async = require("async"),
    crypto = require("crypto"),
    fs = require("fs"),
    path = require("path"),
    redis = require("redis"),
    util = require("util");

////////////////////////////////////////////////////////////////////////////////
// Synchronously initialize the clip library.
function ClipLibrary(dirname, redis_instance) {
    if (typeof(dirname) !== "string")
        throw new Error("Directory name required to initialize ClipLibrary.");

    // Store the redis instance locally:
    this.redis = redis_instance;
    if (typeof(this.redis) !== "object")
        throw new Error("Redis instance required to initialize ClipLibrary.");

    // Store the normalized directory name. Make it absolute, if it wasn't.
    this.directory_name = path.resolve(process.cwd(), dirname);
    // Make sure it already exists; don't create directories willy-nilly.
    if (!path.existsSync(this.directory_name))
        throw new Error("Directory " + dirname + " doesn't exist.");

    // If the "new uploads" directory doesn't already exist, create it.
    // NB, these fs sync commands will throw if anything goes south.
    this.new_uploads_dir = this.directory_name + "/new";
    if (!path.existsSync(this.new_uploads_dir)) {
        fs.mkdirSync(this.new_uploads_dir, "0755");
    };

    // Now audit the contents, having ensured both directories already exist:
    this.audit_contents(true);  // The "true" means laboriously check checksums.
}

// Synchronously audit the contents of the library directory, to check for
// existing files. If the laboriously flag's set, computes checksums too.
ClipLibrary.prototype.audit_contents = function (laboriously) {
    //async.filter(fs.readdirSync(this.directory_name), function (filename) { 
    var files = fs.readdirSync(this.directory_name);
    for (f in files) {
        if (files[f] == "new" || files[f] == "spectrogram.png") continue;

        var file_path = this.directory_name + "/" + files[f];
        var extension = path.extname(file_path);
        var basename = path.basename(file_path, extension);

        // Make sure the filename key exists for this clip id, if not there:
        this.redis.setnx("clip:" + basename + ":filename", file_path);

        // Finally, if we're told to laboriously checksum everything, put all
        // those tasks into the redis work queue to run asynchronously.
        if (laboriously) {
            this.redis.lpush("work_queue",
                    JSON.stringify({ op: "verify checksum",
                                     target: file_path,
                                     pri: "low" }));
        }
    }

    // Next, if there are any files in the "new" directory, ask the Worker
    // to import them, one by one, into the main library.
    var new_files = fs.readdirSync(this.new_uploads_dir);
    for (f in new_files) {
        this.redis.lpush("work_queue",
                JSON.stringify({ op: "import new file",
                                 target: this.new_uploads_dir + "/" + new_files[f],
                                 pri: "med" }));
    }
};

ClipLibrary.prototype.checksum = function (filename, cb) {
    var sha1sum = crypto.createHash("sha1");

    var stream = fs.createReadStream(filename);
    stream.on("error", function (err) {
        cb(err, null);
    });

    stream.on("data", function (data) {
        sha1sum.update(data);
    });

    stream.on("end", function () {
        // Call the original callback with the result:
        cb(null, sha1sum.digest("hex"));
    });
};

ClipLibrary.prototype.checksum_to_id = function (checksum) {
    assert(checksum.length == 40);
    // Our id consists of the first eight hex digits
    return checksum.substr(0, 8);
};

// Given the filename of a clip, import it into the ClipLibrary.
// De-duplicates clips via the SHA-1 checksum.
ClipLibrary.prototype.add_new_clip = function (clip_filename, cb) {
    var sg = this;
    this.checksum(clip_filename, function (err, sha1_checksum) {
        if (err) {
            return cb("Error calculating checksum of new clip: " + err);
        }

        // Convert the SHA-1 checksum to the more compressed clip id:
        var new_clip_id = sg.checksum_to_id(sha1_checksum);

        var extension = path.extname(clip_filename);
        var dbkey = "clip:" + new_clip_id + ":filename";
        sg.redis.get(dbkey, function (err, res) {
            if (res) {
                console.log("New file " + clip_filename + " checksum "
                          + new_clip_id + " already appears in the library.");
                fs.unlink(clip_filename, function (err) {
                    return cb(err);
                });
            } else {
                var new_file = fs.createReadStream(clip_filename);
                var imported_name = sg.directory_name + "/" + new_clip_id + extension;
                var imported = fs.createWriteStream(imported_name);

                util.pump(new_file, imported, function () {
                    sg.redis.set(dbkey, imported_name);
                    fs.unlink(clip_filename, function (err) {
                        cb(err);  // Return the error, if any.
                    });
                });
            }
        });
    });
};

ClipLibrary.prototype.add_segment = function (clip_id, segment) {
    assert(segment.start != null, segment.end != null);

    // Get the next segment id for this clip:
    var client = this.redis;
    this.redis.incr("clip:" + clip_id + ":segment:next", function (err, id) {
        var multi = client.multi();
        // Add the hash keys for this segment, giving all its details:
        multi.hmset("clip:" + clip_id + ":segment:" + id,
            "id", id,
            "added", Date.now(),
            "layer", segment.layer,
            "label", segment.label,
            "start", segment.start,
            "end", segment.end
        );

        // Next add the segment to the ordered set of segments
        // for this clip, by the segment's starting time:
        multi.zadd("clip:" + clip_id + ":segments", segment.start, id);

        // Now kick it all off:
        multi.exec();
    });
};

ClipLibrary.prototype.add_xlabel_segments_for_clip = function (clip_id, layer, xlabel) {
    var current = 0;
    for (i in xlabel.data) {
        var this_segment = xlabel.data[i];
        // The same duration may have multiple different labels:
        for (j in this_segment[1]) {
            this.add_segment(clip_id, { "layer": layer,
                                        "label": this_segment[1][j],
                                        "start": current,
                                        "end": current + parseFloat(this_segment[0]) });
        }

        current += parseFloat(this_segment[0]);
    }
};

ClipLibrary.prototype.get_all_clips = function (cb) {
    this.redis.keys("clip:*:filename", function (err, replies) {
        var clip_ids = [ ];
        for (r in replies) {
            var matches = replies[r].match(/^clip:(.+):filename$/);
            clip_ids.push({ id: matches[1] });
        }

        cb(clip_ids);
    });
};

ClipLibrary.prototype.get_clip_segments = function (clip_id, cb) {
    this.redis.zrange("clip:" + clip_id + ":segments", 0, 100000, function (err, replies) {
        cb(replies);
    });
};

ClipLibrary.prototype.get_segment = function (clip_id, segment_id, cb) {
    var key = "clip:" + clip_id + ":segment:" + segment_id;
    this.redis.hgetall(key, function (err, result) {
        cb(result);
    });
};

ClipLibrary.prototype.get_clip_location = function (clip_id, cb) {
    this.redis.get("clip:" + clip_id + ":filename", function (err, res) {
        cb(res);
    });
};

// Finally, export the ClipLibrary constructor as our module's only hook:
module.exports = ClipLibrary;
