// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

/*$("#waveform").hover(function() {
    // Other cursor options: "move", "col-resize", "text"
    $(this).css("cursor", "crosshair");
}, function() {
    $(this).css("cursor", "auto");
}); */

var ClipView = Backbone.View.extend({
    el: $("#waveform"),
    template: "blah",
    render: function () {
        var sg = this;
        this.el.fadeOut("fast", function () {
            sg.el.empty();
            // Templatize
            sg.el.fadeIn("fast");
        });

        return this;  // To enable chained calls.
    },

    events: {
    }
});

function ClipViewer(div_name, clip_id) {
    //assert(typeof(clip_id) === "string");
    //assert(typeof(div_name) === "string");

    // Store the two input parameters, first off:
    this.clip_id = clip_id;
    this.div_name = div_name;

    // Then store the div, and make sure actually exists somewhere out there:
    this.div = $("#" + div_name);
    //assert(this.div.length);

    this.audio = new ClipAudio(div_name, clip_id);
    this.selection = new Selection(this.div);
    this.spectrogram = null;
    this.waveform = null;

    // Capture the space bar to toggle play/pause.
    // Delegated to the waveform div, which is who we want handling it:
    $("body").bind("keypress", function (e) {
        // Different browsers do different things. Story of my life.
        var key = e.which || e.keyCode || e.keyChar;
        if (key == 32) {
            $("#waveform").trigger("play_audio");
        }
    });
}
