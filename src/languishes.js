#!/usr/local/bin/node
// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

var config = require("config"),
    crypto = require("crypto"),
    express = require("express"),
    fs = require("fs"),
    formidable = require("formidable"),
    path = require("path"),
    util = require("util"),
    wav = require("./wav.js");

////////////////////////////////////////////////////////////////////////////////
// Express Configuration ///////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
var languishes = express.createServer();

languishes.configure(function() {
    languishes.set("views", config.files.root_dir + "src/views/");

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
    //languishes.use(express.static(config.files.root_dir + "src/static/"));
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
// Request Handling Methods ////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
languishes.get("/", function (req, res) {
    res.writeHead(200, { "content-type": "text/html" });
    res.write("<html><head><title>languishes.net</title></head>\n");
    res.write("<body><a href=\"/clips\">clips</a><br>\n");
    res.write("<a href=\"/record\">record</a><br>\n");
    res.write("</body></html>")
    res.end();
});

languishes.get("/record", function (req, res) {
    res.render("record.html", { });
});

languishes.get("/clips", function (req, res) {
    fs.readdir(config.files.upload_dir, function (err, files) {
        if (err) {
            res.writeHead(500, { "content-type": "text/plain" });
            res.end("Server error: " + err);
            throw err;
        }

        res.writeHead(200, { "content-type": "text/html" });
        res.write("<html><body>");
        for (i in files) {
            var basename = path.basename(files[i], ".wav");
            res.write("<a href=\"clip/" + basename + "\">" + basename + "</a>&nbsp;");
            res.write("<a href=\"clip/" + basename + "/info\">(info)</a><br>");
        }
        res.end("</body></html>");
    });
});

languishes.get("/clip/:id", function (req, res) {
    var filename = config.files.upload_dir + req.params.id + ".wav";
    path.exists(filename, function (exists) {
        if (!exists) {
            res.writeHead(404, { "content-type": "text/plain" });
            res.end("No such file: " + filename)
        } else {
            fs.stat(filename, function (err, stats) {
                if (err) {
                    res.writeHead(500, { "content-type": "text/plain" });
                    res.end(err); console.log(err); return;
                }

                // Open a read stream and stream the wav file to the user:
                stream = fs.createReadStream(filename, { encoding: "binary" });
                res.writeHead(200, { "content-type": "audio/wav",
                                     "content-length": stats.size,
                                     "accept-ranges": "bytes",
                                     "content-disposition": "inline; filename=" + req.params.id + ".wav" });

                stream.on("error", function (exception) {
                    console.log(exception);
                    res.end();  // We already sent the 200 header
                });

                stream.on("data", function (data) { res.write(data, "binary"); });
                stream.on("end", function () { res.end(); });
            });
        }
    });
});

languishes.get("/clip/:id/info", function (req, res) {
    var filename = config.files.upload_dir + req.params.id + ".wav";
    path.exists(filename, function (exists) {
        if (!exists) {
            res.writeHead(404, { "content-type": "text/plain" });
            res.end("No such file: " + filename)
        } else {
            fs.readFile(filename, function (err, data) {
                if (err) throw err;

                wav_file = wav.parse_wav(data);
                wav_representation = { }
                for (field in wav_file) {
                    if (field == "raw_data") continue;
                    wav_representation[field] = wav_file[field];
                }

                res.json(wav_representation);
            });
        }
    });
});

languishes.get("/clip/:id/view", function (req, res) {
    var filename = config.files.upload_dir + req.params.id + ".wav";
    path.exists(filename, function (exists) {
        if (!exists) {
            res.writeHead(404, { "content-type": "text/plain" });
            res.end("No such file: " + filename)
        } else {
            res.render("clipview.html", { "clipid": req.params.id });
        }
    });
});

////////////////////////////////////////////////////////////////////////////////
// Uploading Clips /////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function import_new_upload(new_filename) {
    // We'll piece this SHA-1 sum together as data streams in:
    var sha1sum = crypto.createHash("sha1");

    // Open the newly-uploaded file
    var stream = fs.ReadStream(new_filename);
    stream.on("data", function (data) {
        sha1sum.update(data);
    });

    stream.on("end", function () {
        var hexsum = sha1sum.digest("hex");
        console.log(hexsum + " " + new_filename);
    });
}

languishes.post("/upload", function (req, res) {
    // Use Felix Geisendörfer's "formidable" to handle multipart uploads:
    var form = new formidable.IncomingForm();
    form.uploadDir = config.files.upload_dir;
    form.keepExtensions = true;

    form.parse(req, function(err, fields, files) {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(util.inspect({ fields: fields, files: files }));

        file = files["your_file"];
        import_new_upload(file.path);
        fs.readFile(file.path, function (err, data) {
            if (err) throw err;
            wav_file = wav.parse_wav(data);
        });
    });
});

////////////////////////////////////////////////////////////////////////////////
// Static Files ////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
var static_files = {
    "/favicon.ico": "src/static/favicon.ico",

    "/recorder.js": "src/recorder.js/recorder.js",
    "/recorder.swf": "src/recorder.js/recorder.swf",
    "/soundmanager2.js": "src/soundmanager2/script/soundmanager2.js",
    "/soundmanager2_debug.swf": "src/soundmanager2/swf/soundmanager2_debug.swf",

    "/waveform.js": "src/waveform.js",
};

var content_types = {
    ".js": "application/x-javascript",
    ".swf": "application/x-shockwave-flash",
    ".wav": "audio/wav",
};

for (file in static_files) {
    (function (f) {
        languishes.get(f, function (req, res) {
            for (content_type in content_types) {
                var extension_index = f.length - content_type.length;
                if (f.lastIndexOf(content_type) === extension_index) {
                    res.header("Content-Type", content_types[content_type]);
                }
            }
            res.sendfile(config.files.root_dir + static_files[f]);
        });
    }(file));
}

////////////////////////////////////////////////////////////////////////////////
// Server Startup //////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
languishes.listen(3000);
console.log("Express server listening on port %d in %s mode",
            languishes.address().port, languishes.settings.env);
