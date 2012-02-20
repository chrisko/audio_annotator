#!/usr/local/bin/node
// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// server.js -- Request Routing and Address Handling

var crypto = require("crypto"),
    express = require("express"),
    fs = require("fs"),
    formidable = require("formidable"),
    path = require("path"),
    util = require("util");

var ClipLibrary = require("./src/server/cliplibrary.js"),
    Worker = require("./src/server/worker.js"),
    wav = require("./src/server/wav.js");

var redis = require("redis").createClient();
redis.on("error", function (err) {
    console.log("Redis error: " + err);
});

////////////////////////////////////////////////////////////////////////////////
// Configuration ///////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
var config = {
    port: 3000,

    data_dir: __dirname + "/site/data/",
    static_dir: __dirname + "/site/static/",
    views_dir: __dirname + "/src/views/"
};

////////////////////////////////////////////////////////////////////////////////
// Express Configuration ///////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
var languishes = express.createServer();
var io = require("socket.io").listen(languishes);

io.sockets.on("connection", function (socket) {
    socket.on("mouse_move", function (data) {
        console.log("[" + data.t + "] x: " + data.x + ", y: " + data.y);
    });
});

languishes.configure(function() {
    languishes.set("views", config.views_dir);

    // Use mustache templating for .html files, via the stache module.
    languishes.set("view engine", "mustache");
    languishes.register(".html", require("stache"));

    // Set default view options, that we won't have to pass in every time:
    languishes.set("view options", { layout: false });

    // Ordering here matters. The request is passed along.
    // Parse the request body (which in the case of a POST request may be a
    // form, or JSON data) and store the parameters is req.body.
    languishes.use(express.bodyParser());

    languishes.use(express.logger({ format: ":method :url" }));
    languishes.use(express.static(config.static_dir));
});

languishes.configure("dev", function() {
    languishes.use(express.errorHandler({ dumpExceptions: true,
                                          showStack: true }));
});

// Production environment config. Don't show too much.
languishes.configure("prod", function() {
    languishes.use(express.errorHandler());
    // TODO: languishes.use("view cache") for caching.
});

////////////////////////////////////////////////////////////////////////////////
// API Handling Methods ////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
languishes.get("/clips", function (req, res) {
    redis.keys("clip:*:filename", function (err, replies) {
        var clip_ids = [ ];
        for (r in replies) {
            var matches = replies[r].match(/^clip:(.+):filename$/);
            clip_ids.push({ id: matches[1] });
        }

        res.json(clip_ids);
    });
});

////////////////////////////////////////////////////////////////////////////////
// Request Handling Methods ////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
languishes.get("/", function (req, res) {
    //res.writeHead(200, { "content-type": "text/html" });
    res.sendfile(config.static_dir + "index.html");
});

languishes.get("/record", function (req, res) {
    res.render("record.html", { });
});

languishes.get(/^\/clip\/([^\/]+)\.wav$/, function (req, res) {
    var filename = config.data_dir + req.params[0] + ".wav";
    path.exists(filename, function (exists) {
        if (!exists) {
            res.writeHead(404, { "content-type": "text/plain" });
            res.end("No such file: " + filename)
        } else {
            fs.stat(filename, function (err, stats) {
                if (err) {
                    res.writeHead(500, { "content-type": "text/plain" });
                    res.end(err);
                    console.log("Error in stat(" + filename + "): " + err);
                    return;
                }

                // Add the headers to the wav file response:
                res.setHeader("Content-Type", "audio/wav");
                res.setHeader("Content-Length", stats.size);
                res.setHeader("Content-Transfer-encoding", "binary");
                res.setHeader("Accept-Ranges", "bytes");
                res.setHeader("Content-Disposition", "inline; filename=" + req.params[0] + ".wav");

                // And send the file back in the response:
                res.sendfile(filename);
            });
        }
    });
});

/*
languishes.get(/^\/clip\/([^\/]+)$/, function (req, res) {
    var filename = config.data_dir + req.params[0] + ".wav";
    path.exists(filename, function (exists) {
        if (!exists) {
            res.writeHead(404, { "content-type": "text/plain" });
            res.end("No such file: " + filename)
        } else {
            res.render("clipview.html", { "clipid": req.params[0] });
        }
    });
});
*/

languishes.get("/clips/:id/data", function (req, res) {
    var filename = config.data_dir + req.params.id + ".wav";
    wav.parse_wav(filename,
        function (err) {
            res.writeHead(500, { "content-type": "text/plain" });
            res.end(err);
        },
        function (wav) {
            // Check for "begin" and "end" query string parameters:
            var begin = req.param("begin", 0);
            var end = req.param("end", wav.num_samples);
            // And return the samples as a JSON array:
            res.json(wav.get_samples([ begin, end ]));
        });
});

languishes.get("/clips/:id/info", function (req, res) {
    var filename = config.data_dir + req.params.id + ".wav";
    wav.parse_wav(filename,
        function (err) {
            res.writeHead(500, { "content-type": "text/plain" });
            res.end(err);
        },
        function (wav) {
            wav_representation = { }
            for (field in wav) {
                if (field.charAt(0) == '_') continue;
                wav_representation[field] = wav[field];
            }

            res.json(wav_representation);
        });
});

languishes.get("/clips/:id/spectrogram", function (req, res) {
    var filename = config.data_dir + req.params.id;
    var cmd = "sox \"" + filename + "\" -n spectrogram -x 1280 -y 800 -m -r -l -o \"" + config.data_dir + "/spectrogram.png\"";
    console.log(cmd);
    require("child_process").exec(cmd, function (error, stdout, stderr) {
        console.log("stdout: " + stdout);
        console.log("stderr: " + stderr);
        if (error === null) {
            res.sendfile(config.data_dir + "/spectrogram.png");
        } else {
            console.log("sox exec error: " + error);
        }
    });
});

////////////////////////////////////////////////////////////////////////////////
// Uploading Clips /////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
languishes.post("/upload", function (req, res) {
    // Use Felix Geisendörfer's "formidable" to handle multipart uploads:
    var form = new formidable.IncomingForm();
    form.uploadDir = config.fs.data_dir;
    form.keepExtensions = true;

    form.parse(req, function(err, fields, files) {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(util.inspect({ fields: fields, files: files }));

        file = files["recorded_audio_clip"];
        //import_new_upload(file.path);
    });
});

////////////////////////////////////////////////////////////////////////////////
// Server Startup //////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// Synchronously initialize the clip library:
languishes.clip_library = new ClipLibrary(config.data_dir, redis);
// TODO: Start workers.
languishes.worker = new Worker(languishes.clip_library);

languishes.listen(process.env.npm_package_config_port);
console.log("Express server listening on port %d in %s mode",
            languishes.address().port, languishes.settings.env);
