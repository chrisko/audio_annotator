// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

function ClipViewer(div_name, clip_id) {
    this.div_name = div_name;
    this.clip_id = clip_id;

    // Then store the div, and make sure actually exists somewhere out there:
    this.div = $("#" + div_name);

    this.div.hover(function() {
        // Other cursor options: "move", "col-resize", "text"
        $(this).css("cursor", "crosshair");
        }, function() {
            $(this).css("cursor", "auto");
        }
    );

    this.selection = new Selection(this.div);
    this.spectrogram = null;

    console.log("appending waveform!");
    this.div.appendTo("<div id=\"waveform\"></div>");
    this.clip_audio = new ClipAudio("waveform", clip_id);

    var sg = this;
    $("#waveform").on("audio_data_loaded", function () {
        console.log("audio_data_loaded was triggered!");
        sg.waveform = new Waveform("waveform", sg.clip_audio);
        sg.waveform.render();
    });

    // Capture the space bar to toggle play/pause.
    // Delegated to the waveform div, which is who we want handling it:
    var sg = this;
    $("body").bind("keypress", function (e) {
        // Different browsers do different things. Story of my life.
        var key = e.which || e.keyCode || e.keyChar;
        if (key == 32) {
            sg.div.trigger("play_audio");
        }
    });
}
