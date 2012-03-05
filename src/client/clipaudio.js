// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

soundManager.consoleOnly = true;
soundManager.debugMode = true;
soundManager.url = "/";
soundManager.useFastPolling = true;
soundManager.useHighPerformance = true;

soundManager.ontimeout(function (status_msg) {
    $("#error").append("SoundManager2 timed out: " + status_msg);
});

function ClipAudio($el, clip_id) {
    this.$el = $el;
    this.clip_id = clip_id;

    // These two will be created asynchronously:
    this.sound = null;
    this.data = null;

    // Create the sound by loading the audio file from the server:
    var ca = this;
    soundManager.onready(function () {
        ca.sound = soundManager.createSound({
            id: clip_id,
            url: "/clips/" + clip_id + ".wav",
            type: "audio/wav",
            autoLoad: true
        });
    });

    // Simultaneously, grab the audio data as a JSON array:
    $.ajax({
        url: "/clips/" + clip_id + "/data",
        dataType: "json",
        success: function (clip_data) {
            ca.data = clip_data;
            ca.$el.trigger("audio_data_loaded");
        },
    });
}

ClipAudio.prototype.play_audio = function () {
    if (this.sound)
        this.sound.togglePause();
};
