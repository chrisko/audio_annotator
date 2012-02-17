#!/usr/local/bin/node

var assert = require("assert"),
    exec = require("child_process").exec,
    fs = require("fs"),
    path = require("path");

var CLIP_DURATION = 5;
var OUTPUT_DIR = "site/data/new";

////////////////////////////////////////////////////////////////////////////////
function splice_file(filename, audio_info) {
    // 
    var samples = audio_info["Duration"].match(/(\d+) samples/)[1];
    var sample_rate = audio_info["Sample Rate"];
    var duration = CLIP_DURATION * sample_rate;

    var basename = path.basename(filename);

    // Pick a random start point, and splice the audio right there:
    var start = Math.floor(Math.random() * (samples - duration));
    var cmd = "sox \"" + filename + "\" \"site/data/" + basename + "\""
            + " trim " + start + "s " + duration + "s";

    console.log(cmd);
    exec(cmd, function (error, stdout, stderr) {
        if (error) { console.log(stderr); }
        assert(typeof(error) !== "null");
    });
}

function get_audio_info(filename, callback) {
    exec("soxi \"" + filename + "\"", function (error, stdout, stderr) {
        if (error) { console.log(stderr); }
        assert(typeof(error) !== "null");

        var audio_info = { };
        var lines = stdout.split("\n");
        for (l in lines) {
            var match = lines[l].match(/^(.+?)\s*:\s*(.+)$/);
            if (match) {
                audio_info[match[1]] = match[2];
            }
        }

        callback(filename, audio_info);
    });
}

////////////////////////////////////////////////////////////////////////////////
function shuffle(list) {
    var shuffled_list = [ ];
    while (list.length > 0) {
        var index = Math.floor(Math.random() * list.length);
        shuffled_list.push(list.splice(index, 1));
    }
    return shuffled_list;
}

var buckeye = "/Users/ckoenig/src/buckeye/data";
exec("find \"" + buckeye + "\" -iname \"*.wav\"", function (error, stdout, stderr) {
    assert(stderr.length == 0);
    var buckeye_files = stdout.split("\n");

    var shuffled = shuffle(buckeye_files);
    var i; for (i = 0; i < 10; i++) {
        get_audio_info(shuffled[i], splice_file);
    }
});

var b2w = "/Users/ckoenig/Music/iTunes/iTunes Music/Podcasts/Back to Work";
var b2w_files = fs.readdirSync(b2w);
var b2w_shuffled = shuffle(b2w_files);

var i; for (i = 0; i < 10; i++) {
    var full_filename = b2w + "/" + b2w_shuffled[i];
    get_audio_info(full_filename, splice_file);
}
