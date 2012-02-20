// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// cliplibrary.js -- Clip Library Manager

var async = require("async"),
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
        if (!files[f]) continue;
        if (files[f] == "new" || files[f] == "spectrogram.png") continue;

        var extension = path.extname(files[f]);
        var basename = path.basename(files[f], extension);

        // Make sure the filename key exists for this clip id, if not there:
        this.redis.setnx("clip:" + basename + ":filename", files[f]);

        // Finally, if we're told to laboriously checksum everything, put all
        // those tasks into the redis work queue to run asynchronously.
        if (laboriously) {
            console.log("pushing new task for file " + files[f] + "...");
            this.redis.lpush("work_queue",
                    JSON.stringify({ op: "verify checksum",
                                     target: this.directory_name + "/" + files[f],
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

// Given the filename of a clip, import it into the ClipLibrary.
// De-duplicates clips via the SHA-1 checksum.
ClipLibrary.prototype.add_new_clip = function (clip_filename, cb) {
    var sg = this;
    this.checksum(clip_filename, function (err, result) {
        if (err) {
            console.log("Error calculating checksum while adding new clip: " + err);
            cb();
        }

        var extension = path.extname(clip_filename);
        var dbkey = "clip:" + result + ":filename";
        sg.redis.get(dbkey, function (err, res) {
            if (res) {
                console.log("New file " + clip_filename + " checksum "
                          + result + " already appears in the library.");
                fs.unlink(clip_filename, function (err) {
                    if (err) { console.log(err); }
                    cb();
                });
            } else {
                var new_file = fs.createReadStream(clip_filename);
                var imported_name = sg.directory_name + "/" + result + extension;
                var imported = fs.createWriteStream(imported_name);

                util.pump(new_file, imported, function () {
                    sg.redis.set(dbkey, imported_name);
                    fs.unlink(clip_filename, function (err) {
                        if (err) { console.log(err); }
                        cb();
                    });
                });
            }
        });
    });
};

ClipLibrary.prototype.get_clip_location = function (clip_id) {
};

// Finally, export the ClipLibrary constructor as our module's only hook:
module.exports = ClipLibrary;
