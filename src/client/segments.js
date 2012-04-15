// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// Handle display of segment annotations over the audio clip.

var Segment = Backbone.Model.extend({
    defaults: {
        "id": null,
        "start": null,
        "end": null,
        "layer": null,
        "label": null
    },

    render: function (clip, svg_id, delegate) {
        var tstart = parseFloat(this.get("start")) / parseFloat(clip.get("duration"));
        var tend = parseFloat(this.get("end")) / parseFloat(clip.get("duration"));

        var svg = d3.select(svg_id);
        var svg_width = $(svg_id).width();

        if (tstart < 0) tstart = 0;
        if (tend > 1) tend = 1;

        // Put the segment rectangle and the label text in the same SVG group.
        var group = svg.append("g")
            .attr("class", "segment-group");

        // The segment rectangle has to come before the text, since it's underneath:
        var rect = group.append("rect")
            .attr("class", "segment")
            .attr("x", Math.round(tstart * svg_width))
            .attr("y", 0)  // Top.
            .attr("width", Math.round((tend - tstart) * svg_width))
            .attr("height", 20);
        // Then, on top of the rectangle comes the label text:
        var text = group.append("text")
            .attr("class", "label")
            .attr("text-anchor", "middle")
            .text(this.get("label") ? this.get("label").split(/[;,]/)[0] : "");

        // Add the ids for each new SVG element, so we can access them later:
        if (this.isNew()) {
            console.log("segment render isNew()!");
            group.attr("class", "segment-group new-segment");
        } else {
            group.attr("id", "segment-" + this.id + "-group");
            rect.attr("id", "segment-" + this.id + "-rect");
            text.attr("id", "segment-" + this.id + "-text");
        }

        group.on("click", _.bind(function (which_rect) {
            if (which_rect.attr("class").match(/selected/)) return;
            // Remove the "selected" class from any previously selected segment:
            svg.select(".selected").attr("class", "segment");
            // And add it onto the currently selected segment instead:
            which_rect.attr("class", "segment selected");
            delegate.trigger("segment:clicked", this);
        }, this, rect));

        // Calculate text x- and y-coordinates, remembering "text-anchor: middle" above:
        var text_x = parseFloat(rect.attr("x")) + 0.5 * parseFloat(rect.attr("width")),
            text_y = parseFloat(rect.attr("y")) + 0.5 * parseFloat(rect.attr("height"));
        // And update the text node's CSS properties accordingly:
        text.attr("x", Math.round(text_x))
            .attr("y", Math.round(text_y))
            .attr("dy", ".35em");  // Simulates "vertical-align: middle".

        // Get the width of the bounding box around the text and compare it to
        // the segment's rectangle width, to see if we need to scale the text:
        var rect_to_text_width = rect.attr("width") / text.node().getBBox().width;
        if (rect_to_text_width < 1) {
            // A simple SVG scale() would actually transform the coordinates
            // as well. We need to translate first, and then scale:
            var t = -1 * parseFloat(text.attr("x")) * (rect_to_text_width - 1);
            var translate = "translate(" + t + ", 0) ";
            var scale = "scale(" + rect_to_text_width + ", 1)";
            text.attr("transform", translate + scale);
        }

        // Add a helpful "Click to edit" tooltip to help the user out:
        $(".segment-group:not(.new-segment) .label").tooltip({
            title: "Click to edit", placement: "bottom"
        });

        // If anyone out there is listening (like the EditPane logic),
        // trigger a "segment:rendered" event to kick off other processes:
        this.trigger("segment:rendered");
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
    this.collection.url = "/clips/" + this.clip.id + "/segments";

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
    this.delegate.on("selection:finalized", this.unselect, this);
    this.delegate.on("view:bound_to_dom", this.find_svg, this);

    // And to our collection's events:
    this.collection.on("add", this.add_one, this);
    this.collection.on("change", this.change_one, this);
    this.collection.on("remove", this.remove_one, this);
    this.collection.on("reset", this.reset, this);
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

Segments.prototype.unselect = function () {
    if (this.svg)
        this.svg.select(".selected").attr("class", "segment");
};

Segments.prototype.add_one = function (s) {
    s.render(this.clip, this.svg_id, this.delegate);
};

Segments.prototype.change_one = function (s) {
    this.remove_one(s);
    this.add_one(s);
};

Segments.prototype.remove_one = function (s) {
    // If the segment was removed, get rid of the SVG representation:
    $("#segment-" + s.id + "-group").remove();
};

Segments.prototype.render = function (range) {
    // We can't render until we've loaded the data and looked up our SVG.
    if (!this.loaded || !this.svg) return;

    var i; for (i = 0; i < this.collection.length; i++) {
        this.add_one(this.collection.at(i));
    }
};
