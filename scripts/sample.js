#!/usr/local/bin/node

var assert = require("assert"),
    async = require("async"),
    exec = require("child_process").exec,
    fs = require("fs"),
    path = require("path");

var CLIP_DURATION = 5;  // In seconds.
var OUTPUT_DIR = "site/data/new";

// Given a list, return a randomly shuffled copy.
function shuffle(list) {
    var shuffled_list = [ ];
    while (list.length > 0) {
        var index = Math.floor(Math.random() * list.length);
        shuffled_list.push(list.splice(index, 1));
    }
    return shuffled_list;
}

// Get the SoX audio info for an audio file, consisting of a map of such
// keys as Duration, Sample Rate, and some others I care less about.
function get_audio_info(filename, cb) {
    var cmd = "soxi \"" + filename + "\"";
    exec(cmd, function (error, stdout, stderr) {
        if (error) { cb(stderr, null); }
        assert(typeof(error) !== "null");

        var audio_info = { };
        var lines = stdout.split("\n");
        for (l in lines) {
            var match = lines[l].match(/^(.+?)\s*:\s*(.+)$/);
            if (match) audio_info[match[1]] = match[2];
        }

        cb(null, audio_info);
    });
}

// Sample a few seconds of this audio file.
function splice_file(filename, audio_info, cb) {
    // From the information we already parsed out in get_audio_info() above,
    // extract the Duration and Sample Rate, and calculate the duration.
    var samples = audio_info["Duration"].match(/(\d+) samples/)[1];
    var sample_rate = audio_info["Sample Rate"];
    var duration = CLIP_DURATION * sample_rate;

    var output_file = OUTPUT_DIR + "/" + path.basename(filename);
    // Pick a random start point, and splice the audio right there:
    var start = Math.floor(Math.random() * (samples - duration));
    var cmd = "sox \"" + filename + "\" \"" + output_file + "\""
            + " trim " + start + "s " + duration + "s";

    console.log(cmd);
    exec(cmd, function (error, stdout, stderr) {
        if (error) { cb(stderr, null); }
        cb(null, stdout);
    });
}

// Do all the processing asynchronously, passing each one's results
async.waterfall([
    // Add the Buckeye Corpus filenames:
    function (cb) {
        var buckeye = "/Users/ckoenig/src/buckeye/data";
        var find_cmd = "find \"" + buckeye + "\" -iname \"*.wav\"";
        exec(find_cmd, function (error, stdout, stderr) {
            cb(error ? stderr : null, stdout.split("\n"));
        });
    },

    // Then list out the B2W filenames, appending them to the list:
    //"b2wfiles": function (filenames, cb) {
    //    var itunes = "/Users/ckoenig/Music/iTunes/iTunes Music";
    //    var b2w = itunes + "/Podcasts/Back to Work";
    //    fs.readdir(b2w, function (err, b2wfiles) {
    //        cb(err, filenames.concat(b2wfiles));
    //    });
    //},

    // Next grab five randomly-selected files:
    function (filenames, cb) {
        var audio_info = [ ];
        var shuffled = shuffle(filenames).splice(0, 5);

        // One by one, get the audio properties of each filename:
        async.forEachSeries(shuffled,
            // For every filename in the shuffled array, do this (in series):
            function (item, cb2) {
                // Asynchronously get the audio info for this file:
                get_audio_info(item, function (err, this_info) {
                    // And append it to the list, before the callback:
                    if (this_info) audio_info.push(this_info);
                    cb2(err);
                });
            },
            // After all the above calls have been made:
            function (err) {
                // Pass the audio_info array on to the next stage:
                cb(err, audio_info);
            }
        );
    },

    // By now we have all the audio info, so splice out 5s from each clip:
    function (audio_info, cb) {
        async.forEachSeries(audio_info,
            function (item, cb2) {
                var filename = item["Input File"].replace(/'/g, "");
                splice_file(filename, item, function (err, stdout) {
                    cb2(err);
                });
            },
            function (err) {
                if (err) {
                    console.log(err);
                    process.exit(1);
                }
            }
        );
    }
]);
