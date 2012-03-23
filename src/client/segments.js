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
    this.delegate = delegate;
    this.clip_id = clip_id;
    this.svg_id = svg_id;
    this.loaded = false;

    this.collection = new SegmentList({ clip_id: clip_id });
    this.collection.clip_id = clip_id;
    this.collection.url = "/clips/" + clip_id + "/segments/all";

    var s = this;
    this.collection.fetch({
        success: function (collection, response) {
            s.collection = collection;
            s.loaded = true;
            s.delegate.trigger("segments:loaded");
        },
        error: function (collection, response) {
            console.log("Error fetching Segments: " + response);
        }
    });

    // Bind to the events we're interested in:
    this.delegate.on("segments:loaded", this.render, this);
    this.delegate.on("view:bound_to_dom", this.find_svg, this);
}

Segments.prototype.find_svg = function () {
    var svg = d3.select(this.svg_id);
    if (svg.empty()) throw "No SVG element " + this.svg_id + " found!";
    this.svg = svg;

    // If we've loaded our data and found our SVG element, render the segments:
    if (this.loaded) this.render();
};

Segments.prototype.height = function () {
    return $(this.svg_id).height();
};

Segments.prototype.width = function () {
    return $(this.svg_id).width();
};

Segments.prototype.render = function (range) {
    // We can't render until we've loaded the data and looked up our SVG.
    if (!this.loaded || !this.svg) return;

    // First, select the segments that are visible:
    console.log("rendering segments...");
    var i; for (i = 0; i < this.collection.length; i++) {
        var this_segment = this.collection.at(i);
        console.log("appending segment " + this_segment.get("start")
                                   + "-" + this_segment.get("end"));

        /*
        this.svg.append("line")
            .attr("class", "segment")
            .attr("x1", this_segment.begin / 5)
            .attr("y1", 0.15 * this.height())
            .attr("x1", this_segment.end / 5)
            .attr("y1", 0.10 * this.height());
        */
    }
};
