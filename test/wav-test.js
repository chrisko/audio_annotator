#!/usr/local/bin/node

var vows = require("vows"),
    assert = require("assert");

var wav = require("../src/wav.js");

vows.describe("wav").addBatch({
    "An empty wav buffer": {
        topic: new Buffer([ ]),

        "throws a RIFF header parsing exception": function (empty_data) {
            assert.throws(function () { wav.parse(empty_data); }, Error);
        }
    }
}).export(module);
