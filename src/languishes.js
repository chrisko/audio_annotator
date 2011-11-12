#!/usr/local/bin/node
// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

var express = require("express"),
    formidable = require("formidable"),
    util = require("util"),
    wav = require("./wav.js");

////////////////////////////////////////////////////////////////////////////////
// Express Configuration ///////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
var languishes = express.createServer();

languishes.configure(function() {
    // Ordering here matters. The request is passed along.

    // Parse the request body (which in the case of a POST request may be a
    // form, or JSON data) and store the parameters is req.body.
    languishes.use(express.bodyParser());

    languishes.use(express.logger({ format: ':method :url' }));
    languishes.use(express.static(__dirname + "/static/"));
});

languishes.configure("dev", function() {
    languishes.use(express.errorHandler({ dumpExceptions: true,
                                          showStack: true }));
});

// Production environment config. Don't show too much.
languishes.configure("prod", function() {
    languishes.use(express.errorHandler());
    // TODO: Cache.
});

////////////////////////////////////////////////////////////////////////////////
// Request Handling Methods ////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
languishes.get("/", function (req, res) {
    res.writeHead(200, {"content-type": "text/html"});
    res.write("<html><head><title>languishes.net</title></head>\n");
    res.write("<body><a href=\"/files\">files</a><br>\n");
    res.write("<a href=\"/record.html\">record</a><br>\n");
    res.write("</body></html>")
    res.end();
});

languishes.get("/files", function (req, res) {
    require("fs").readdir(__dirname + "/../data/new/", function (err, files) {
        if (err) {
            res.writeHead(500, {"content-type": "text/plain"});
            res.end("Server error: " + err);
            throw err;
        }

        res.writeHead(200, {"content-type": "text/html"});
        res.write("<html><body>");
        for (i in files) {
            var basename = require("path").basename(files[i], ".wav");
            res.write("<a href=\"file/" + basename + "\">"
                      + basename + "</a><br>");
        }
        res.end("</body></html>");
    });
});

languishes.get("/file/:id", function (req, res) {
    var filename = __dirname + "/../data/new/" + req.params.id + ".wav";
    require("path").exists(filename, function (exists) {
        if (!exists) {
            res.writeHead(404, {"content-type": "text/plain"});
            res.end("No such file: " + filename)
        } else {
            res.writeHead(200, {"content-type": "text/plain"});
            require("fs").readFile(filename, function (err, data) {
                if (err) throw err;
                wav_file = wav.parse_wav(data);
                for (field in wav_file) {
                    if (field == "raw_data") continue;
                    res.write(field + ": " + util.inspect(wav_file[field]) + "\n");
                }
                res.end();
            });
        }
    });
});

languishes.get("/file/:id/view", function (req, res) {
    var filename = __dirname + "/../data/new/" + req.params.id + ".wav";
    require("path").exists(filename, function (exists) {
        if (!exists) {
            res.writeHead(404, {"content-type": "text/plain"});
            res.end("No such file: " + filename)
        } else {
            res.writeHead(200, {"content-type": "text/html"});
            res.end("TODO");
        }
    });
});

////////////////////////////////////////////////////////////////////////////////
// Uploading Clips /////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
var DATA_DIR = __dirname + "/../data/"
var NEW_UPLOADS_DIR = DATA_DIR + "new/";

function import_new_upload(new_filename) {
    // We'll piece this SHA-1 sum together as data streams in:
    var sha1sum = require("crypto").createHash("sha1");

    // Open the newly-uploaded file
    var stream = require("fs").ReadStream(new_filename);
    stream.on("data", function (data) {
        sha1sum.update(data);
    });

    stream.on("end", function () {
        var hexsum = sha1sum.digest("hex");
        console.log(hexsum + " " + new_filename);
    });
}

languishes.post("/upload", function (req, res) {
    //console.log(req);
    //res.redirect("back");

    // Use Felix Geisendörfer's "formidable" to handle multipart uploads:
    var form = new formidable.IncomingForm();
    form.uploadDir = NEW_UPLOADS_DIR;
    form.keepExtensions = true;

    form.parse(req, function(err, fields, files) {
        res.writeHead(200, {'content-type': 'text/plain'});
        res.end(util.inspect({fields: fields, files: files}));

        file = files["your_file"];
        import_new_upload(file.path);
        require("fs").readFile(file.path, function (err, data) {
            if (err) throw err;
            wav_file = wav.parse_wav(data);
        });
    });
});

////////////////////////////////////////////////////////////////////////////////
// Server Startup //////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
languishes.listen(3000);
console.log("Express server listening on port %d in %s mode",
            languishes.address().port, languishes.settings.env);
