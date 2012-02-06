// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

soundManager.consoleOnly = true;
soundManager.debugMode = false;
soundManager.url = "/";
soundManager.useFastPolling = true;
soundManager.useHighPerformance = true;

soundManager.ontimeout(function (status) {
    $("#error").append("SoundManager2 timed out.");
});

function ClipAudio(div_name, clip_id) {
    this.div = $("#" + div_name);
    this.clip_id = clip_id;

    // Create the sound by loading the wav file from the server:
    this.sound = null;
    soundManager.onready(function () {
        this.sound = soundManager.createSound({
            id: clip_id,
            url: "/clip/" + clip_id + ".wav",
            type: "audio/wav",
            autoLoad: true
        });
    });

    // Simultaneously, grab the audio data as a JSON array:
    var clip_data = $.getJSON("/clip/" + clip_id + "/data")
    .error(this.on_error.bind(this))
    .success(this.on_success.bind(this));
}

ClipAudio.prototype.on_error = function (xhr, err) {
    $("#error").append("<br>Error retrieving audio data: " + err);
}

ClipAudio.prototype.on_success = function (clip_data, stat, xhr) {
    // Store this data array as a property of the SoundManager clip:
    $("#waveform").data = clip_data;
    this.div.trigger("audio_data_loaded", this.data);

    this.div.bind("play_audio", function () {
        console.log(this);
        if (this.sound)
            this.sound.togglePause();

        //return false;  // Stop event propagation.
    });
};
