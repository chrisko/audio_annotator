var Clip = Backbone.Model.extend({
    urlRoot: "/clips",
    defaults: {
        "id": null,
        "name": null
    }
});

var ClipList = Backbone.Collection.extend({
    url: "/clips",
    model: Clip,
    comparator: function (clip) {
        return clip.get("id");
    }
});

var ClipNameView = Backbone.View.extend({
    // To be rendered as an element in a <ul> list:
    tagName: "li",

    // view-source:http://documentcloud.github.com/backbone/examples/todos/index.html
    template: "<div class=\"clipname\">"
              + "<div class=\"clipdisplay\">"
                + "<div class=\"clipname\"></div>"
                + "<span class=\"clipduration\"></div>"
                + "<span class=\"clipadded\"></div>"
              + "</div>"
              + "<div class=\"clipedit\">"
                + "<input class=\"clipinput\" type=\"text\" value=\"\" />"
              + "</div>"
            + "</div>"
});

var ClipListView = Backbone.View.extend({
    template: "<ul id=\"cliplist\" class=\"playlist dark\">"
            + "<% _.each(clips, function (clip) { %>"
              + "<li>"
                + "<div class=\"clipdisplay\">"
                  + "<a class=\"cliplink\" href=\"#clips/<%= clip.id %>\">"
                    + "<i class=\"icon-headphones icon-large\"></i>"
                    + "<%= clip.get(\"name\") || clip.id %>"
                  + "</a>"
                + "</div>"
                + "<div class=\"clipedit\">"
                  + "<input class=\"clipinput\" type=\"text\" value=\"\" />"
                + "</div>"
              + "</li>"
            + "<% }); %>",

    events: {
        "dblclick div.cliplink": "edit",
        "keypress .clipinput": "update_on_enter"
    },

    initialize: function () {
        this.model.bind("reset", this.addAll, this);
        //this.model.bind("all", this.render, this);
    },

    render: function () {
        var clv = this;
        this.$el.fadeOut("fast", function () {
            var clip_array = clv.model.toArray();
            var contents = _.template(clv.template, { clips: clip_array });
            clv.$el.html(contents);
            clv.$el.fadeIn("fast");
        });

        return this;
    },

    addAll: function () {
    },

    edit: function () {
        console.log("edit!");
        // Change the element's class so our CSS can re-style it:
        this.$el.addClass("editing");
        this.$(".clipinput").focus();
    },

    update_on_enter: function (e) {
        if (e.keyCode != 13) return;
        console.log("update!");
        //var text = this.input.val();
        //if (!text || e.keyCode != 13) return;
        //Todos.create({text: text});
        //this.input.val("");
    }
});

var ClipView = Backbone.View.extend({
    audio: null,
    playmarker: null,
    range: null,
    selection: null,
    waveform: null,

    events: {
        // UI Events:
        "mouseenter #clipvis": function () { this.$el.css("cursor", "crosshair"); },
        "mouseleave #clipvis": function () { this.$el.css("cursor", "auto"); }
    },

    template: "<center>"
              + "<div id=\"clipvis\">"
                + "<img id=\"spectrogram\" src=\"clips/<%= id %>/spectrogram\">"
                + "<svg id=\"clipsvg\"></svg>"
              + "</div>"
            + "</center>",

    initialize: function () {
        // Make sure these event handlers are always called with this ClipView.
        _.bindAll(this, "handle_keydown");
        _.bindAll(this, "handle_resize");
        // And bind to the keydown and resize events. Unbound in destroy().
        $(document).bind("keydown", this.handle_keydown);
        $(window).bind("resize", this.handle_resize);
    },

    destroy: function () {
        // Remove this View instance from the DOM:
        this.remove();
        // And remember to unbind the global events we subscribed to above:
        $(document).unbind("keydown", this.handle_keydown);
        $(window).unbind("resize", this.handle_resize);
        // And finally, get rid of all our audio data:
        if (this.audio) this.audio.destroy();
        if (this.playmarker) this.playmarker.destroy();
        if (this.selection) this.selection.destroy();
        if (this.waveform) this.waveform.destroy();
    },

    render: function () {
        var sg = this;
        this.$el.fadeOut("fast", function () {
            var contents = _.template(sg.template, { id: sg.id });
            sg.$el.append(contents);

            sg.audio = new ClipAudio(sg, sg.id);
            sg.playmarker = new Playmarker(sg, "#clipsvg");
            sg.segments = new Segments(sg, sg.model, "#clipsvg");
            sg.selection = new Selection(sg, "#clipsvg");
            sg.waveform = new Waveform(sg, "#clipsvg", sg.audio);

            sg.$el.fadeIn("fast");
            window.scrollTo(0, 0);
        });

        return this;
    },

    handle_keydown: function (e) {
        var key = e.which || e.keyCode || e.keyChar;
        if (key == 32) {
            // Trigger the "audio:toggle" event, which the ClipAudio instance
            // should be listening for. Will play (or pause) the user's audio.
            this.trigger("audio:toggle");
            return false;  // Don't propagate spaces up.
        }

        return true;  // Anything else, let the browser have.
    },

    handle_resize: function (e) {
        this.trigger("window:resize");
        if (this.waveform) {
            this.waveform.destroy();
            this.waveform.render();
        }
    },

    handle_reset_play_marker: function () {
        this.waveform.reset_play_marker();
        return false;
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

    initialize: function () {
        this._currentclip = null;
        if (!this._cliplist)
            this._cliplist = new ClipList;
    },

    // Handle the "no fragment" (or I guess empty fragment) page rendering.
    index: function () {
        var ls = this;
        this._cliplist.fetch({
            success: function (collection, response) {
                ls._cliplist = collection;

                if (!ls._cliplistview)
                    ls._cliplistview = new ClipListView({ model: ls._cliplist });

                // For more on this pattern, see
                // https://github.com/documentcloud/backbone/issues/957
                ls.$el.empty();
                ls.$el.append(ls._cliplistview.render(true).el);

                // Some things (like D3 selections) won't work until the view
                // is actually bound to the DOM. Trigger those events now.
                ls._cliplistview.trigger("view:bound_to_dom");
            }
        });
    },

    // Handle the "#clips/12345" fragment rendering:
    hashclips: function (id, range) {
        this._currentclip = id;
        var clip = new Clip({ id: id });

        var ls = this;
        clip.fetch({
            success: function (model) {
                if (ls._clipview) ls._clipview.destroy();
                ls._clipview = new ClipView({ "id": id, "model": clip });

                ls.$el.empty();
                ls.$el.append(ls._clipview.render(true).el);
                ls._clipview.trigger("view:bound_to_dom");
            }
        });
    }
});
