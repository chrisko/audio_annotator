// Via https://github.com/jwagener/recorder.js/blob/master/examples/example-2.html
function timecode(ms) {
    var hms = {
        h: Math.floor(ms / (60 * 60 * 1000)),
        m: Math.floor((ms / 60000) % 60),
        s: Math.floor((ms / 1000) % 60),
       ms: Math.floor(ms % 1000)
    };
    var tc = [];  // Timecode array to be joined with '.'
    if (hms.h > 0) {
        tc.push(hms.h);
    }
    tc.push((hms.m < 10 && hms.h > 0 ? "0" + hms.m : hms.m));
    tc.push((hms.s < 10  ? "0" + hms.s : hms.s));
    tc.push(hms.ms);
    return tc.join(':');
}

Recorder.initialize({
    swfSrc: "/swf/recorder.swf"
});

function record() {
    Recorder.record({
        progress: function (ms) {
            $("#time").html(timecode(ms));
        }
    });
}

function play() {
    Recorder.stop();
    Recorder.play({
        progress: function (ms) {
            $("#time").html(timecode(ms));
        }
    });
}

function stop() {
    Recorder.stop();
}

function upload() {
    Recorder.upload({
        url: "http://localhost:3000/upload",
        audioParam: "recorded_audio_clip"
    });
}

window.onload = function () {
    $("#record_button").click(function () {
        start_recording(Recorder);
    });
};

//<a href="javascript:record()" id="record">Record</a>
//<a href="javascript:play()" id="play">Play</a>
//<a href="javascript:stop()" id="stop">Stop</a>
//<a href="javascript:upload()" id="stop">Upload</a>

//<span id="time">0:00:000</span>
