var Clip = Backbone.Model.extend({
    urlRoot: "/clips",
    defaults: {
        "id": null,
        "name": "(no name)"
    }
});

var ClipList = Backbone.Collection.extend({
    model: Clip,
    comparator: function (clip) {
        return clip.get("id");
    }
});

var Selection = Backbone.Model.extend({
    defaults: {
        "id": null,
        "start": null,
        "end": null
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
    _audio: null,
    _selection: null,
    _waveform: null,

    events: {
        // UI Events:
        //"click .waveform": "",
        //"mousedown .waveform": "",
        "mouseenter #waveform": function () { this.$el.css("cursor", "crosshair"); },
        "mouseleave #waveform": function () { this.$el.css("cursor", "auto"); },

        "mousedown #waveform": function (e) { this.update_selection("mousedown", e); },
        "mousemove #waveform": function (e) { this.update_selection("mousemove", e); },
        "mouseup #waveform": function (e) { this.update_selection("mouseup", e); },

        // Custom Events:
        "audio_data_loaded": "handle_audio_data_loaded",
        "play_audio": function () { this.audio.play_audio(); }
    },

    template: "<center>"
              + "<div id=\"clipvis\">"
                + "<img id=\"spectrogram\" src=\"clips/<%= id %>/spectrogram\">"
                + "<div id=\"waveform\">"
              + "</div>"
            + "</center>",

    initialize: function () {
        // Bind the document keydown event. Unbound later, in destroy().
        _.bindAll(this, "handle_keydown");
        $(document).bind("keydown", this.handle_keydown);
    },

    render: function () {
        var sg = this;
        this.$el.fadeOut("fast", function () {
            sg.$el.empty();
            var contents = _.template(sg.template, { id: sg.id });
            sg.$el.html(contents);

            if (sg.audio == null) sg.audio = new ClipAudio(sg.$el, sg.id);
            if (sg.selection == null) sg.selection = new Selection(sg.$el);
            sg.waveform = null;  // Until the audio data's loaded.

            sg.$el.fadeIn("fast");
            window.scrollTo(0, 0);
        });

        return this;
    },

    destroy: function () {
        this.remove();
        $(document).unbind("keydown", this.handle_keydown);
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
            this.trigger("play_audio");
            return false;  // Don't propagate spaces up.
        }

        return true;  // Anything else, let the browser have.
    },

    update_selection: function (event_name, e) {
        if (event_name == "mousedown") {
            console.log("mouse is down!");
        } else if (event_name == "mousemove") {
            console.log("mouse moved!");
        } else if (event_name == "mouseup") {
            console.log("mouse is up!");
        }

        return false;  // No propagation.
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
        "clips/:id": "hashclips"
    },

    initialize: function (options) {
        // If we already fetched the cliplist, consider things initialized.
        if (this._cliplist !== null)
            return this;

        var ws = this;
        // If we've not yet loaded the clips, make that AJAX call here:
        $.ajax({
            url: "clips",
            dataType: "json",
            data: { },
            success: function (data) {
                ws._cliplist = new ClipList(data);
                ws._cliplistview = new ClipListView({ model: ws._cliplist });
                Backbone.history.loadUrl();
            }
        });

        return this;
    },

    // Handle the "no fragment" (or I guess empty fragment) page rendering.
    index: function () {
        this._currentclip = null;

        this.$el.empty();
        this.$el.append(this._cliplistview.render().el);
    },

    // Handle the "#clips/12345" fragment rendering:
    hashclips: function (id) {
        this._currentclip = id;
        this._clipview = new ClipView({ id: id });

        this.$el.empty();
        this.$el.append(this._clipview.render().el);
    }

    // Handle the "#clips/12345/segment
});
