// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// cliplibrary.js -- Clip Library Manager

var async = require("async"),
    crypto = require("crypto"),
    fs = require("fs"),
    path = require("path"),
    redis = require("redis");

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

        var extension = path.extname(files[f]);
        var basename = path.basename(files[f], extension);

        // Make sure the filename key exists for this clip id, if not there:
        this.redis.setnx("clip:" + basename + ":filename", files[f]);

        // Finally, if we're told to laboriously checksum everything, put all
        // those tasks into the redis work queue to run asynchronously.
        if (laboriously) {
            this.redis.lpush("work_queue",
                    JSON.stringify({ op: "verify checksum",
                                     target: files[f],
                                     pri: "low" }));
        }

    }

    var new_files = fs.readdirSync(this.new_uploads_dir);
};

ClipLibrary.prototype.checksum = function (filename) {
    var sha1sum = crypto.createHash("sha1");

    var stream = fs.ReadStream(this.directory_name + "/" + files[f]);
    stream.on("data", function (data) {
        sha1sum.update(data);
    });

    stream.on("end", function () {
        var hexsum = sha1sum.digest("hex");
        console.log(hexsum + " " + new_filename);
    });
};

ClipLibrary.prototype.add_new_clip = function (clip_stream) {
};

ClipLibrary.prototype.get_clip_location = function (clip_id) {
};

// Finally, export the ClipLibrary constructor as our module's only hook:
module.exports = ClipLibrary;
