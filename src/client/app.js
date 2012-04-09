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

var ClipItemView = Backbone.View.extend({
    // To be rendered as an element in a <ul> list:
    tagName: "li",

    // view-source:http://documentcloud.github.com/backbone/examples/todos/index.html
    template: _.template($('#clipitem-template').html()),

    initialize: function () {
        _.bindAll(this, "render", "close", "remove");
        this.model.bind("change", this.render);
        this.model.bind("destroy", this.remove);
    },

    render: function () {
        this.$el.html(this.template({ clip: this.model }));
        this.input = this.$(".clipinput");
        return this;
    },

    events: {
        "click .clipdisplay": "route",
        "dblclick label.clipname": "edit",
        "keypress .clipinput": "update_on_enter",
        "blur .clipinput": "close"
    },

    route: function () {
        window.app.navigate("clips/" + this.model.id, { trigger: true });
    },

    edit: function () {
        // Change the element's class so our CSS can re-style it:
        this.$el.addClass("editing");
        // And select the input field, now that it's visible:
        this.input.focus();
    },

    update_on_enter: function (e) {
        if (e.keyCode == 13) this.close();
    },

    close: function () {
        // Save the new clip name to the backend:
        if (this.input.val().match(/\S/))
            this.model.save({ name: this.input.val() });
        // And instruct our CSS to remove the input box:
        this.$el.removeClass("editing");
    }
});

var ClipListView = Backbone.View.extend({
    template: _.template($('#cliplist-template').html()),

    initialize: function () {
        this.$el.html(this.template({ }));
        this.collection = new ClipList();

        _.bindAll(this, "add_all", "add_one");
        this.collection.bind("add", this.add_one);
        this.collection.bind("reset", this.add_all);

        this.collection.fetch();
    },

    add_all: function () {
        this.collection.each(this.add_one);
    },

    add_one: function (clip) {
        var view = new ClipItemView({ model: clip });
        this.$("#cliplist").append(view.render().el);
    }
});

var ClipView = Backbone.View.extend({
    audio: null,
    playmarker: null,
    range: null,
    selection: null,
    waveform: null,

    template: _.template($('#clipview-template').html()),

    initialize: function () {
        // Make sure these event handlers are always called with this ClipView.
        _.bindAll(this, "handle_keydown", "handle_resize");
        // And bind to the keydown and resize events. Unbound in destroy().
        $(document).bind("keydown", this.handle_keydown);
        $(window).bind("resize", this.handle_resize);
    },

    render: function () {
        this.$el.html(this.template({ id: this.model.id }));

        this.audio = new ClipAudio(this, this.model.id);
        this.playmarker = new Playmarker(this, "#clipsvg", this.model);
        this.segments = new Segments(this, this.model, "#clipsvg");
        this.selection = new Selection(this, "#clipsvg", this.model);
        this.waveform = new Waveform(this, "#clipsvg", this.audio);

        return this;
    },

    destroy: function () {
        // Explicitly get rid of all our audio data:
        if (this.audio) this.audio.destroy();
        if (this.playmarker) this.playmarker.destroy();
        if (this.selection) this.selection.destroy();
        if (this.waveform) this.waveform.destroy();
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
    }
});

// The ViewTransition() object below uses View.close(), which we'll define
// here as "remove the View from the DOM, and unbind all bound events".
Backbone.View.prototype.close = function () {
    if (this.destroy) {
        this.destroy();
    }

    this.remove();
    this.unbind();
}

// http://lostechies.com/derickbailey/2011/09/15/zombies-run-managing-page-transitions-in-backbone-apps
function ViewTransition() {
    this.el = "#main";
    this.$el = $(this.el);

    this.showView = function (view) {
        if (this.currentView) {
            var vt = this;
            this.$el.fadeOut("fast", function () {
                vt.currentView.close();
                vt.currentView = view;

                // For more on this pattern, see
                // https://github.com/documentcloud/backbone/issues/957
                vt.currentView.render();
                vt.$el.html(vt.currentView.el);

                // Some things (like D3 selections) won't work until the view
                // is actually bound to the DOM. Trigger those events now.
                vt.currentView.trigger("view:bound_to_dom");

                vt.$el.fadeIn("fast");
                window.scrollTo(0, 0);
            });
        } else {
            this.currentView = view;
            this.currentView.render();
            this.$el.html(this.currentView.el);
            this.currentView.trigger("view:bound_to_dom");
        }
    };
}

Languishes = Backbone.Router.extend({
    // Maps URL fragments to functions below, to handle link rendering.
    routes: {
        "": "index",
        "clips/:id": "hashclips",
        // This format is based on http://www.w3.org/TR/media-frags (§4.2.1)
        "clips/:id/:range": "hashclips"
    },

    initialize: function () {
        this.view_transition = new ViewTransition();
    },

    // Handle the "no fragment" (or I guess empty fragment) page rendering.
    index: function () {
        var cliplistview = new ClipListView();
        this.view_transition.showView(cliplistview);
    },

    // Handle the "#clips/12345" fragment rendering:
    hashclips: function (id, range) {
        var clip = new Clip({ id: id });

        var ls = this;
        clip.fetch({
            success: function () {
                var clipview = new ClipView({ "model": clip });
                ls.view_transition.showView(clipview);
            }
        });
    }
});
