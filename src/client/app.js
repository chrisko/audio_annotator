var Clip = Backbone.Model.extend({
    urlRoot: "/clips",
    defaults: {
        "id": null,
        "name": "(no name)"
    }
});

var ClipList = Backbone.Collection.extend({
    url: "/clips",
    model: Clip,
    comparator: function (clip) {
        return clip.get("id");
    }
});

var Segment = Backbone.Model.extend({
    defaults: {
        "id": null,
        "begin": null,
        "end": null,
        "layer": null,
        "content": null
    }
});

var Selection = Backbone.Model.extend({
    defaults: {
        "anchor": null,
        "start": null,
        "end": null,
        "is_finalized": false,
    },

    initialize: function (input) {
        if (typeof(input) === "undefined")
            throw "New Selection requires a map of initial settings.";
        if (typeof(input.anchor) === "undefined")
            throw "New Selection requires an initial anchor point.";

        this.anchor = input.anchor;
    },

    destroy: function () {
        // Triggering redraw_selection with null erases the current selection.
        this.trigger("redraw_selection", null);
    },

    update: function (new_x, finalize) {
        // Assign the new start and end positions based on where the cursor
        // began and where it is now. This is keeping in mind that they user
        // might be dragging *left*, rather than right.
        if (!this.is_finalized) {
            this.start = _.min([ this.anchor, new_x ]);
            this.end = _.max([ this.anchor, new_x ]);
            this.trigger("redraw_selection", this);
        }

        if (finalize) {
            this.is_finalized = true;
            console.log("Finalized selection at: [" + this.start + ", " + this.end + "]");
            // This tells the audio to cue up at the right spot, and al
            this.trigger("finalized_selection");
        }
    }
});

var ClipListView = Backbone.View.extend({
    template: "<ul class=\"playlist dark\">"
            + "<% _.each(clips, function (clip) { %>"
              + "<li>"
                + "<a href=\"#clips/<%= clip.id %>\">"
                  + "<%= clip.name || clip.id %>"
                + "</a>"
              + "</li>"
            + "<% }); %>",

    render: function () {
        var sg = this;
        this.$el.fadeOut("fast", function () {
            sg.$el.empty();
            var contents = _.template(sg.template, { clips: sg.model.toArray() });
            sg.$el.html(contents);
            sg.$el.fadeIn("fast");
        });

        return this;
    }
});

var ClipView = Backbone.View.extend({
    audio: null,
    selection: null,
    waveform: null,

    events: {
        // UI Events:
        //"click .waveform": "",
        //"mousedown .waveform": "",
        "mouseenter #waveform": function () { this.$el.css("cursor", "crosshair"); },
        "mouseleave #waveform": function () { this.$el.css("cursor", "auto"); },

        "mousedown #waveform": "update_selection",
        "mousemove #waveform": "update_selection",
        "mouseup #waveform": "update_selection",

        // Custom Events:
        "audio_data_loaded": "handle_audio_data_loaded",
        "play_audio": "handle_play_audio"
    },

    template: "<center>"
              + "<div id=\"clipvis\">"
                + "<img id=\"spectrogram\" src=\"clips/<%= id %>/spectrogram\">"
                + "<div id=\"waveform\">"
              + "</div>"
            + "</center>",

    initialize: function () {
        // Make sure handle_keydown is always called with this ClipView.
        _.bindAll(this, "handle_keydown");
        // Bind the document keydown event. Unbound later, in destroy().
        $(document).bind("keydown", this.handle_keydown);

        _.bindAll(this, "handle_resize");
        $(window).bind("resize", this.handle_resize);
    },

    destroy: function () {
        this.remove();
        $(document).unbind("keydown", this.handle_keydown);
        $(window).unbind("resize", this.handle_resize);
        if (this.audio)
            this.audio.destroy();
    },

    render: function () {
        var sg = this;
        this.$el.fadeOut("fast", function () {
            sg.$el.empty();
            var contents = _.template(sg.template, { id: sg.id });
            sg.$el.html(contents);

            if (sg.audio == null) sg.audio = new ClipAudio(sg.$el, sg.id);
            sg.waveform = null;  // Until the audio data's loaded.

            sg.$el.fadeIn("fast");
            window.scrollTo(0, 0);
        });

        return this;
    },

    handle_audio_data_loaded: function () {
        if (this.waveform == null) {
            this.waveform = new Waveform($("#waveform"), this.audio);
            this.waveform.render();
        }

        return false;  // Prevent event propagation.
    },

    handle_keydown: function (e) {
        var key = e.which || e.keyCode || e.keyChar;
        if (key == 32) {
            this.handle_play_audio();
            return false;  // Don't propagate spaces up.
        }

        return true;  // Anything else, let the browser have.
    },

    handle_resize: function (e) {
        if (this.waveform) {
            this.waveform.destroy();
            this.waveform = new Waveform($("#waveform"), this.audio);
            this.waveform.render();
        }
    },

    update_selection: function (e) {
        if (e.type == "mousedown") {
            // If there's already a Selection, clear it out:
            if (this.selection) {
                this.selection.unbind("redraw_selection");
                this.selection.destroy();
            }

            // Then create the new Selection, anchoring to where the mouse
            // first went down, and bind to its "redraw_selection" event:
            this.selection = new Selection({ anchor: e.offsetX });
            this.selection.bind("redraw_selection",
                                this.handle_redraw_selection, this);
        } else if (e.type == "mousemove") {
            // Don't process movements unless we're actually selecting:
            if (this.selection && !this.selection.is_finalized)
                this.selection.update(e.offsetX, false);
        } else if (e.type == "mouseup") {
            // The "true" finalizes this Selection, which produces an event
            // that ends up calculating the actual time range and cues up
            // the audio at the right spot.
            this.selection.update(e.offsetX, true);
        }

        return false;  // No propagation.
    },

    handle_redraw_selection: function () {
        if (this.waveform)
            this.waveform.redraw_selection(this.selection);

        return false;
    },

    handle_play_audio: function () {
        this.audio.play_audio();
    }
});

var Languishes = Backbone.Router.extend({
    el: "#main",
    $el: $("#main"),

    _cliplist: null,  // The list of all clips, returned by the server.
    _currentclip: null,  // If a specific clip is selected, it's kept here.
    _segmentlist: null,  // The current clip's segments, if any.

    // Maps URL fragments to functions below, to handle link rendering.
    routes: {
        "": "index",
        "clips/:id": "hashclips",
        // This format is based on http://www.w3.org/TR/media-frags (§4.2.1)
        "clips/:id/:range": "hashclips"
    },

    // Handle the "no fragment" (or I guess empty fragment) page rendering.
    index: function () {
        this._currentclip = null;
        if (!this._cliplist) {
            this._cliplist = new ClipList;
            this._cliplist.fetch();
        }

        var ls = this;
        this._cliplist.fetch({
            success: function (collection, response) {
                ls._cliplist = collection;

                if (!ls._cliplistview)
                    ls._cliplistview = new ClipListView({ model: ls._cliplist });

                // For more on this pattern, see
                // https://github.com/documentcloud/backbone/issues/957
                ls.$el.empty();
                ls.$el.append(ls._cliplistview.render().el);
            }
        });
    },

    // Handle the "#clips/12345" fragment rendering:
    hashclips: function (id, range) {
        console.log("hashclips called with id " + id + ", range " + range);
        this._currentclip = id;

        if (this._clipview) this._clipview.destroy();
        this._clipview = new ClipView({ id: id });

        this.$el.empty();
        this.$el.append(this._clipview.render().el);
    }
});
