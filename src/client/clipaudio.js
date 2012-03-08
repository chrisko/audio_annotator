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

function ClipAudio(delegate, clip_id) {
    this.delegate = delegate;
    this.clip_id = clip_id;

    // These two will be created asynchronously:
    this.sound = null;
    this.data = null;

    // Subscribe to various events that will be triggered on the delegate:
    this.delegate.on("audio:toggle", this.toggle_audio, this);

    // Finally, kick of the asynchronous loading of audio data:
    var ca = this;

    // Create the sound by loading the audio file from the server:
    soundManager.onready(function () {
        ca.sound = soundManager.createSound({
            id: clip_id,
            url: "/clips/" + clip_id + ".wav",
            type: "audio/wav",
            autoLoad: true,
            multiShot: false
        });
    });

    // Simultaneously, grab the audio data as a JSON array:
    $.ajax({
        url: "/clips/" + clip_id + "/data",
        dataType: "json",
        success: function (clip_data) {
            ca.data = clip_data;
            ca.delegate.trigger("audio:loaded");
        }
    });
};

ClipAudio.prototype.destroy = function () {
    // Call SoundManager's "destruct" to stop, unload, and destroy the clip:
    this.sound.destruct();
    // Just to be explicit, we're getting rid of this data:
    delete this.data;
    // And we're not emitting any more events:
    this.off();
};

ClipAudio.prototype.toggle_audio = function () {
    if (!this.sound) return;

    if (this.sound.paused) {
        this.sound.resume();
        return;
    }

    if (this.sound.playState == 1) {
        // The audio is playing (or buffering in preparation to play).
        this.sound.pause();
        this.delegate.trigger("audio:paused",
                              this.sound.position,
                              this.sound.duration);

        this.sound.setPosition(this.sound.position);

        return;
    }

    // The audio's not playing, so start it up:
    var ca = this;
    this.sound.play({
        //from: 
        whileplaying: function () {
            if (this.paused || this.isBuffering || this.readyState != 3) return;
            ca.delegate.trigger("audio:playing", this.position, this.duration);
        },
        onbufferchange: function () {
            if (this.isBuffering)
                this.delegate.trigger("audio:paused", this.position, this.duration);
        },
        onfinish: function () {
            ca.delegate.trigger("audio:done_playing");
        }
    });
};

ClipAudio.prototype.cue_up_portion = function () {
    if (this.sound) {
        this.sound.stop();
        // http://www.schillmania.com/projects/soundmanager2/doc/#sm-config
        this.sound.setPosition(ms);
    }
};
