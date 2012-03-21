// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// Handle display of segment annotations over the audio clip.

var Segment = Backbone.Model.extend({
    defaults: {
        "id": null,
        "begin": null,
        "end": null,
        "layer": null,
        "label": null
    }
});

var SegmentList = Backbone.Collection.extend({
    model: Segment,
    clip_id: null,
    url: null,
    comparator: function (segment) {
        return segment.get("id");
    }
});

function Segments(delegate, clip_id, svg_id) {
    this.clip_id = clip_id;
    this.delegate = delegate;

    this.collection = new SegmentList({ clip_id: clip_id });
    this.collection.clip_id = clip_id;
    this.collection.url = "/clips/" + clip_id + "/segments";

    var s = this;
    this.collection.fetch({
        success: function (collection, response) {
            s.delegate.trigger("segments:loaded");
        },
        error: function (collection, response) {
            console.log("Error fetching Segments: " + response);
        }
    });

    // Bind to the events we're interested in:
    //this.model.bind("reset", this.
}

//Segments.prototype.display
