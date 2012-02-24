// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

soundManager.consoleOnly = true;
soundManager.debugMode = false;
soundManager.url = "/";
soundManager.useFastPolling = true;
soundManager.useHighPerformance = true;

soundManager.ontimeout(function (status_msg) {
    $("#error").append("SoundManager2 timed out: " + status_msg);
});

function ClipAudio(div_name, clip_id) {
    this.div = $("#" + div_name);
    this.clip_id = clip_id;

    // Create the sound by loading the wav file from the server:
    this.sound = null;
    soundManager.onready(function () {
        this.sound = soundManager.createSound({
            id: clip_id,
            url: "/clips/" + clip_id + ".wav",
            type: "audio/wav",
            autoLoad: true
        });
    });

    var sg = this;

    // Simultaneously, grab the audio data as a JSON array:
    var clip_data = $.getJSON("/clips/" + clip_id + "/data")
    .error(function (xhr, err) {
        $("#error").append("<br>Error retrieving audio data: " + err);
    })
    .success(function (clip_data, stat, xhr) {
        // Store this data array as a property of the SoundManager clip:
        $("#waveform").data = clip_data;
        sg.div.trigger("audio_data_loaded", sg.data);

        sg.div.bind("play_audio", function () {
            console.log(sg);
            if (sg.sound)
                sg.sound.togglePause();

            //return false;  // Stop event propagation.
        });
    });
}
