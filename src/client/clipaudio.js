// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

soundManager.consoleOnly = true;
soundManager.debugMode = true;
soundManager.url = "/";
soundManager.useFastPolling = true;
soundManager.useHighPerformance = true;

function ClipAudio(div, clip_id) {
    // Create the Clip object
    this.sound = soundManager.createSound({
        id: clip_id,
        url: "/clip/" + clip_id + ".wav",
        type: "audio/wav",
        autoLoad: true,
        whileplaying: function () {
            console.log("playing!");
        }
    });

    var clip_data = $.getJSON("/clip/" + clip_id + "/data")
    .error(function (xhr, err) {
        console.log("error getting data: " + err);
        this.div.trigger("audio error");
    })
    .success(function (clip_data, stat, xhr) {
        // Store this data array as a property of the SoundManager clip:
        this.data = clip_data;

        this.div.trigger("audio loaded");
    });
}
