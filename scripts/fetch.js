#!/usr/local/bin/node
// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// fetch.js -- Fetch static third-party prerequisites. Part of npm postinstall.

var assert = require("assert"),
    http = require("http"),
    fs = require("fs"),
    stache = require("stache"),
    url = require("url");

var prereqs_filename = "./config/prereqs.json";
var output_dir = "./site/static";

var prerequisites = JSON.parse(fs.readFileSync(prereqs_filename, "utf8"));
for (var prereq in prerequisites) {
    this_prereq = prerequisites[prereq];
    for (var f in this_prereq.files) {
        templated_url = this_prereq.url + this_prereq.files[f];
        var file_url = url.parse(stache.render(templated_url, this_prereq));
        http.get(file_url, function (res) {
            console.log("GOT RESPONSE");
            console.log(res.statusCode);
        }, function (error) {
            console.log("ERROR");
            console.log(error);
        });
    }
}

// Finally, dump out everything we've fetched to that fetched.txt file:
f
