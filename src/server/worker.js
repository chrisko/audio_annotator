// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// worker.js -- Worker to process background jobs on the server

var async = require("async"),
    util = require("util");

var xlabel = require("./xlabel.js");

function Worker(clip_library) {
    if (!clip_library)
        throw new Error("ClipLibrary instance required.");

    this.clip_library = clip_library;
    this.redis = require("redis").createClient();

    this.process_task();
}

Worker.prototype.operations = {
    "verify checksum": function (task, cb) {
        if (!task.target) {
            task.error = "No target given.";
            return cb(task, false);
        }

        this.clip_library.checksum(task.target, function (err, result) {
            if (err) {
                task.error = err;
                return cb(task, false);
            }

            if (task.target.match(result.substr(0, 8))) {
                return cb(task, true);
            } else {
                task.error = "Filename " + task.target + " doesn't match the "
                           + "file checksum " + result + ".";
                return cb(task, false);
            }
        });
    },

    "import new file": function (task, cb) {
        if (!task.target) {
            task.error = "No target given.";
            return cb(task, false);
        }

        this.clip_library.add_new_clip(task.target, function (err) {
            if (err) {
                task.error = err;
                cb(task, false);
            } else {
                cb(task, true);
            }
        });
    },

    "import segments": function (task, cb) {
        if (!task.source) {
            task.error = "No source file given.";
            return cb(task, false);
        }

        if (!task.clip_id) {
            task.error = "No clip id given.";
            return cb(task, false);
        }

        var cl = this.clip_library;
        var redis = this.redis;
        xlabel.parse_xlabel_file(task.source, function (result) {
            // The range may be null, in which case nothing will change.
            var remapped = xlabel.remap_to_range(result, task.range);
            cl.add_xlabel_segments_for_clip(task.clip_id, task.layer, remapped);

            // Add another task for assigning the clip a name, now that we've
            // got some segments that sort of describe its contents:
            redis.lpush("work_queue", JSON.stringify({
                op: "assign clip name",
                clip_id: task.clip_id
            }));

            cb(task, true);
        });
    },

    "assign clip name": function (task, cb) {
        var redis = this.redis;
        this.clip_library.get_all_clip_segments(task.clip_id, function (segments) {
            var tokens = [ ];
            for (i in segments) {
                var word = segments[i].label.split(/[,;\s]/)[0];
                if (word && word[0] != "<")
                    tokens.push(word);
            }

            var name = tokens.join(" ").replace(/^\s+|\s+$/g, "");
            if (name.length > 30) {
                name = name.slice(0, 30).replace(/\s+$/g, "");
                name += "...";
            }

            if (name.match(/\S/)) {
                redis.hsetnx("clip:" + task.clip_id, "name", name);
            }

            cb(task, true);
        });
    }
};

Worker.prototype.process_task = function () {
    var wrkr = this;
    var db = this.redis;

    // This call blocks ("b") if nothing's available, which is exactly what
    // we want. When something comes in, this'll move it to the "processing"
    // queue and return it to us, for processing.
    this.redis.brpoplpush("work_queue", "processing", 0, function (err, response) {
        var task = JSON.parse(response);

        if (typeof(task.op) !== "string") {
            task.error = "Task has no operation.";
            return;
        }

        if (!wrkr.operations[task.op]) {
            task.error = "Unknown task operation: " + task.op;
            return;
        }

        // Perform the task, afterwards removing it from the
        // processing list and starting on the next one, if any:
        wrkr.operations[task.op].call(wrkr, task, function (task, result) {
            if (result != true) {
                console.log("Task failed: " + util.inspect(task));  // TODO
            }

            db.lrem("processing", 1, response);
            process.nextTick(function () { wrkr.process_task(); });
        });
    });
};

module.exports = Worker;
