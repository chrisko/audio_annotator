#!/usr/local/bin/node

var express = require("express"),
    formidable = require("formidable");

var languishes = module.exports = express.createServer();

languishes.configure(function() {
    // Ordering here matters. The request is passed along.

    // Parse the request body (which in the case of a POST request may be a
    // form, or JSON data) and store the parameters is req.body.
    languishes.use(express.bodyParser());

    //languishes.use(express.methodOverride());
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

languishes.post("/upload", function (req, res) {
    //console.log(req);
    //res.redirect("back");

    // Use Felix Geisendörfer's "formidable" to handle multipart uploads:
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
      res.writeHead(200, {'content-type': 'text/plain'});
      res.write('received upload:\n\n');
      res.end(require("sys").inspect({fields: fields, files: files}));
      console.log(require("sys").inspect({fields: fields, files: files}));
    });
});

languishes.listen(3000);
console.log("Serving content from %s/static/", __dirname);
console.log("Express server listening on port %d in %s mode",
            languishes.address().port, languishes.settings.env);
