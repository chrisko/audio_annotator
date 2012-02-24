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
    el: $("#main"),
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
    el: $("#main"),

    template: "<center>"
              + "<img id=\"spectrogram\" src=\"clips/<%= id %>/spectrogram\">"
              + "<div id=\"waveform\"></div>"
            + "</center>",

    render: function () {
        // Before any of the view stuff, set up the ClipAudio object:
        this.clipaudio = new ClipViewer("waveform", this.id);

        var sg = this;
        this.$el.fadeOut("fast", function () {
            sg.$el.empty();
            var contents = _.template(sg.template, { id: sg.id });
            sg.$el.html(contents);
            sg.$el.fadeIn("fast");
        });
        return this;
    }
});

var Languishes = Backbone.Router.extend({
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
        //assert(this._cliplistview);  // Should have been initialized above.
        this._cliplistview.render();
    },

    // Handle the "#clips/12345" fragment rendering:
    hashclips: function (id) {
        this._currentclip = id;
        this._clipview = new ClipView({ id: id });
        this._clipview.render();
    }

    // Handle the "#clips/12345/segment
});
