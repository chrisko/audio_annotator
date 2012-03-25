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
languishes.get("/", function (req, res) {
    // Our Backbone.js app is fully contained in the index.html file. It will
    // load its dependencies and data as required, using the API calls below.
    res.sendfile(config.static_dir + "index.html");
});

languishes.get("/clips", function (req, res) {
    languishes.clip_library.get_all_clips(function (ids) {
        res.json(ids);
    });
});

languishes.get("/clips/all", function (req, res) {
    languishes.clip_library.get_all_clips(function (ids) {
        res.json(ids);
    });
});

languishes.get("/record", function (req, res) {
    res.render("record.html", { });
});

languishes.get(/^\/clips\/([^\/]+)\.wav$/, function (req, res) {
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

languishes.get("/clips/:id/data", function (req, res) {
    languishes.clip_library.get_clip_location(req.params.id, function (filename) {
        wav.parse_wav(filename,
            function (err) {
                res.writeHead(500, { "content-type": "text/plain" });
                res.end(err);
            },
            function (wav) {
                // Check for "begin" and "end" query string parameters:
                var begin = parseInt(req.param("begin", 0));
                var end = parseInt(req.param("end", wav.num_samples));
                // And return the samples as a JSON array:
                res.json(wav.get_samples([ begin, end ]));
            }
        );
    });
});

languishes.get("/clips/:id", function (req, res) {
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
    redis.hget("clip:" + req.params.id, "filename", function (err, filename) {
        // Check to see if the spectrogram exists already. Otherwise, generate it.
        var spectrogram_filename = config.data_dir + "/" + req.params.id + ".png";
        path.exists(spectrogram_filename, function (exists) {
            if (exists) {
                res.sendfile(spectrogram_filename);
            } else {
                var cmd = "sox \"" + filename + "\" -n spectrogram "
                        + "-x 1280 -y 800 -m -r -l -o \""
                        + spectrogram_filename + "\"";

                require("child_process").exec(cmd, function (error, stdout, stderr) {
                    if (error) {
                        console.log("sox exec error: " + error);
                    } else {
                        res.sendfile(spectrogram_filename);
                    }
                });
            }
        });
    });
});

languishes.get("/clips/all", function (req, res) {
    languishes.clip_library.get_all_clips(function (all_clips) {
        res.json(all_clips);
    });
});

languishes.get("/clips/:id/segments/all", function (req, res) {
    var clip_id = req.params.id;
    languishes.clip_library.get_clip_segments(clip_id, function (segments) {
        var multi = redis.multi();
        for (i in segments) {
            multi.hgetall("clip:" + clip_id + ":segment:" + segments[i]);
        }

        multi.exec(function (err, replies) {
            res.json(replies);
        });
    });
});

languishes.get("/clips/:id/segments", function (req, res) {
    var clip_id = req.params.id;
    languishes.clip_library.get_clip_segments(clip_id, function (segments) {
        res.json(segments);
    });
});

languishes.get("/clips/:clipid/segment/:segmentid", function (req, res) {
    var clip_id = req.params.clipid, segment_id = req.params.segmentid;
    languishes.clip_library.get_segment(clip_id, segment_id, function (segment) {
        res.json(segment);
    });
});

////////////////////////////////////////////////////////////////////////////////
// Uploading Clips /////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
languishes.post("/upload", function (req, res) {
    // Use Felix Geisendörfer's "formidable" to handle multipart uploads:
    var form = new formidable.IncomingForm();
    form.uploadDir = languishes.clip_library.new_uploads_dir;
    form.keepExtensions = true;

    form.parse(req, function(err, fields, files) {
        file = files["recorded_audio_clip"];
        languishes.clip_library.add_new_clip(file.path, function (err) {
            if (err) {
                res.writeHead(500, { "content-type": "text/plain" });
                res.end(err);
            } else {
                res.writeHead(200, { "content-type": "text/plain" });
                res.end(util.inspect({ fields: fields, files: files }));
            }
        });
    });
});

////////////////////////////////////////////////////////////////////////////////
// Server Startup //////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// Synchronously initialize the clip library:
languishes.clip_library = new ClipLibrary(config.data_dir, redis);
languishes.worker = new Worker(languishes.clip_library);

languishes.listen(process.env.npm_package_config_port);
console.log("Express server listening on port %d in %s mode",
            languishes.address().port, languishes.settings.env);
