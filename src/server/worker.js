// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// worker.js -- Worker to process background jobs on the server

var async = require("async"),
    util = require("util");

////////////////////////////////////////////////////////////////////////////////
function Worker(clip_library) {
    if (!clip_library)
        throw new Error("ClipLibrary instance required.");

    this.clip_library = clip_library;
    this.redis = require("redis").createClient();

    this.process_task();
}

////////////////////////////////////////////////////////////////////////////////
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

            if (task.target.match(result)) {
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
    }
};

////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////
module.exports = Worker;
