// Via https://github.com/jwagener/recorder.js/blob/master/examples/example-2.html
function recorder_timecode(ms) {
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


function recorder_record() {
    // Enable the stop button while we're recording:
    $("#stop-button").attr("disabled", false);

    Recorder.record({
        progress: function (ms) {
            $("#recorder-time").html(recorder_timecode(ms));
        }
    });
}

function recorder_play() {
    // Enable the stop button while we're playing audio:
    $("#stop-button").attr("disabled", false);

    Recorder.stop();
    Recorder.play({
        progress: function (ms) {
            $("#recorder-time").html(recorder_timecode(ms));
        },
        finished: function () {
            $("#stop-button").attr("disabled", true);
        }
    });
}

function recorder_stop() {
    Recorder.stop();
    // Disable the stop button:
    $("#stop-button").attr("disabled", true);
    // And enable both play and upload:
    $("#play-button").attr("disabled", false);
    $("#upload-button").attr("disabled", false);
}

function recorder_upload() {
    Recorder.upload({
        method: "POST",
        url: "/upload",
        audioParam: "recorded_audio_clip",
        success: function (clip_json) {
            var clip = JSON.parse(clip_json);
            window.app.navigate("clips/" + clip.id, { trigger: true });
        }
    });
}
