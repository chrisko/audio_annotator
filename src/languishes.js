#!/usr/local/bin/node

var express = require("express"),
    formidable = require("formidable"),
    wav = require("./wav.js");

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
            res.write("<a href=\"file/" + basename + "\">" + basename + "</a><br>");
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
                    res.write(field + ": " + require("util").inspect(wav_file[field]) + "\n");
                }
                res.end();
            });
        }
    });
});

languishes.post("/upload", function (req, res) {
    //console.log(req);
    //res.redirect("back");

    // Use Felix Geisendörfer's "formidable" to handle multipart uploads:
    var form = new formidable.IncomingForm();
    form.uploadDir = __dirname + "/../data/new/";
    form.keepExtensions = true;

    form.parse(req, function(err, fields, files) {
        res.writeHead(200, {'content-type': 'text/plain'});
        res.write('received upload:\n\n');
        res.end(require("sys").inspect({fields: fields, files: files}));

        file = files["your_file"];
        require("fs").readFile(file.path, function (err, data) {
            if (err) throw err;
            wav_file = wav.parse_wav(data);
        });
    });
});

languishes.listen(3000);
console.log("Express server listening on port %d in %s mode",
            languishes.address().port, languishes.settings.env);
