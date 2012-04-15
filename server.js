#!/usr/local/bin/node
// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// server.js -- Request Routing and Address Handling

var crypto = require("crypto"),
    express = require("express"),
    fs = require("fs"),
    formidable = require("formidable"),
    path = require("path"),
    util = require("util"),
    validator = require("validator");

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

languishes.put("/clips/:id", function (req, res) {
    try {
        var name = req.body.name;
        var clean_name = validator.sanitize(name).xss();
        validator.check(req.body.id).is(/^[0-9a-f]{4,12}$/);

        var client = redis;
        redis.exists("clip:" + req.body.id, function (err, exists) {
            if (err) throw new Error(err);
            if (!exists) throw new Error("Clip " + req.body.id + " does not exist");
            client.hset("clip:" + req.body.id, "name", clean_name, function (err, response) {
                if (err) throw new Error(err);
                res.writeHead(200, { "content-type": "text/plain" });
                res.end(req.body.id + " name changed to \"" + clean_name + "\"");
            });
        });
    } catch (e) {
        console.log(e.message);
        res.writeHead(400, { "content-type": "text/plain" });
        res.end(e.message);
    }
});

languishes.get("/clips/:id/spectrogram", function (req, res) {
    languishes.clip_library.get_spectrogram_filename(req.params.id,
        function (err, filename) {
            if (err) {
                console.log("sox exec error: " + error);
                res.writeHead(500, { "content-type": "text/plain" });
                res.end("Error generating spectrogram: " + error);
            } else {
                res.sendfile(filename);
            }
        }
    );
});

languishes.get("/clips/:id/segments", function (req, res) {
    var clip_id = req.params.id;
    languishes.clip_library.get_all_clip_segments(clip_id, function (segments) {
        res.json(segments);
    });
});

languishes.get("/clips/:clipid/segments/:segmentid", function (req, res) {
    var clip_id = req.params.clipid, segment_id = req.params.segmentid;
    languishes.clip_library.get_segment(clip_id, segment_id, function (segment) {
        res.json(segment);
    });
});

languishes.post("/clips/:clipid/segments", function (req, res) {
    console.log(req.body);
    // Get the next available segment id for this particular clip:
    redis.incr("clip:" + req.params.clipid + ":segment:next", function (err, id) {
        if (err) {
            console.log("Error getting new segment id: " + err);
            res.writeHead(500, { "content-type": "text/plain" });
            res.end("Error getting new segment id: " + err);
        } else {
            console.log("Adding new segment id " + id);
            var multi = redis.multi();
            multi.hmset("clip:" + req.params.clipid + ":segment:" + id,
                "id", id,
                "added", Date.now(),
                "layer", req.body.layer,
                "label", req.body.label,
                "start", req.body.start,
                "end", req.body.end
            );

            multi.zadd("clip:" + req.params.clipid + ":segments", req.body.start, id);
            multi.exec(function (err) {
                if (err) {
                    console.log("Error inserting new segment: " + err);
                    res.writeHead(500, { "content-type": "text/plain" });
                    res.end("Error inserting new segment: " + err);
                } else {
                    // The response is JSON, with any attributes changed by
                    // the server. In our case, it's just the "id" field.
                    res.writeHead(200, { "content-type": "application/json" });
                    res.end(JSON.stringify({ "id": id }));
                    console.log(JSON.stringify({ "id": id }));
                }
            });
        }
    });
});

languishes.delete("/clips/:clipid/segments/:segmentid", function (req, res) {
    var segment_key = "clip:" + req.params.clipid + ":segment:" + req.params.segmentid;
    var segments_key = "clip:" + req.params.clipid + ":segments";
    redis.zrem(segments_key, req.params.segmentid, function (err) {
        if (err) {
            console.log("Error deleting segment: " + err);
            res.writeHead(500, { "content-type": "text/plain" });
            res.end("Error deleting segment: " + err);
        } else {
            res.writeHead(200, { "content-type": "text/plain" });
            res.end("Deleted segment " + req.params.segmentid + ".");
            // Keep the hash, but asynchronously add a "deleted" timestamp:
            redis.hset(segment_key, "deleted", Date.now());
        }
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

languishes.listen(config.port);
console.log("Express server listening on port %d in %s mode",
            languishes.address().port, languishes.settings.env);
