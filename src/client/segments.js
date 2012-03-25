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

function Segments(delegate, clip, svg_id) {
    this.delegate = delegate;
    this.clip = clip;
    this.svg_id = svg_id;
    this.loaded = false;

    this.collection = new SegmentList({ clip_id: this.clip.id });
    this.collection.clip_id = this.clip.id;
    this.collection.url = "/clips/" + this.clip.id + "/segments/all";

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

Segments.prototype.do_ranges_overlap = function (range1, range2) {
    var r1unbounded = (_.isNull(range1[0]) || _.isNull(range1[1]));
    var r2unbounded = (_.isNull(range2[0]) || _.isNull(range2[1]));

    if (r1unbounded || r2unbounded) {
        // First case: if either of the ranges is totally unbounded (i.e.,
        // [ null, null ]), they definitely overlap.
        if (_.isNull(range1[0]) && _.isNull(range1[1])) return true;
        if (_.isNull(range2[0]) && _.isNull(range2[1])) return true;

        // Next, if both ranges are unbounded in the same direction:
        if (_.isNull(range1[0]) && _.isNull(range2[0])) return true;
        if (_.isNull(range1[1]) && _.isNull(range2[1])) return true;

        if (r1unbounded && r2unbounded) {
            // So they're unbounded in opposite directions
            if (_.isNull(range1[0])) {
                return (range1[1] >= range2[0]);
            } else {
                return (range1[0] <= range2[1]);
            }
        }

        // So just one is unbounded.
        if (_.isNull(range1[0])) return (range2[0] <= range1[1]);
        if (_.isNull(range1[1])) return (range2[1] >= range1[0]);
        if (_.isNull(range2[0])) return (range1[0] <= range2[1]);
        if (_.isNull(range2[1])) return (range1[1] >= range2[0]);
    } else {
        // If both ranges are bounded, there's a quick test
        // http://c2.com/cgi/wiki?TestIfDateRangesOverlap
        if (!(range1[1] <= range2[0] || range2[1] <= range1[0])) return true;
    }

    return false;
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

        console.log("transformed: " + this_segment.get("start") / this.clip.start,
                                    + "-" + this_segment.get("end") / this.clip.end);
        console.log(this.clip);

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