// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// worker.js -- Worker to process background jobs on the server

var operations = {
    "verify checksum": function (task) {
        if (!task.target) {
            task.error = "No target given.";
            return false;
        }

        // TODO this.clip_library.checksum(task.target, function (err, result) {

        return true;
    }
};

////////////////////////////////////////////////////////////////////////////////
function Worker(clip_library) {
    if (!clip_library)
        throw new Error("ClipLibrary instance required.");

    this.clip_library = clip_library;
    this.redis = require("redis").createClient();

    this.process_task();
}

////////////////////////////////////////////////////////////////////////////////
Worker.prototype.process_task = function () {
    var db = this.redis;

    this.redis.rpoplpush("work_queue", "processing", function (err, response) {
        var task = JSON.parse(response);
        console.log(task);

        if (typeof(task.op) !== "string") {
            task.error = "Task has no operation.";
            return;
        }

        if (!operations[task.op]) {
            task.error = "Unknown task operation: " + task.op;
            return;
        }

        console.log("worker pretending to process task " + task.op + "...");
        db.lrem("processing", 1, response);
        console.log("removed task from processing list:" + response);
    });
};

////////////////////////////////////////////////////////////////////////////////
module.exports = Worker;
