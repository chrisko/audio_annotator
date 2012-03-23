// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

function Selection(delegate, svg_id) {
    this.delegate = delegate;
    this.svg_id = svg_id;

    // To begin with, nothing's selected. All these are null/false.
    this.anchor = null;
    this.start = null;
    this.end = null;
    this.finalized = false;

    // When we're finally bound to the DOM, complete our initialization:
    this.delegate.on("view:bound_to_dom", this.bind_to_dom, this);
}

Selection.prototype.bind_to_dom = function () {
    var svg = d3.select(this.svg_id);
    if (svg.empty()) throw "No SVG element " + this.svg_id + " found!";
    this.svg = svg;

    this.svg.on("mousedown", handle_mouse_event);
    this.svg.on("mousemove", handle_mouse_event);
    this.svg.on("mouseup", handle_mouse_event);

    var sel = this;
    function handle_mouse_event(d, i) {
        if (d3.event.type == "mousedown") {
            // Clear out any existing selection we might have:
            sel.anchor = d3.event.offsetX;
            sel.start = null;
            sel.end = null;
            sel.finalized = false;

            sel.redraw();
        } else if (d3.event.type == "mousemove") {
            // Don't process movements unless we're actually selecting:
            if (!sel.finalized)
                sel.update(d3.event.offsetX, false);
        } else if (d3.event.type == "mouseup") {
            // The "true" finalizes this Selection.
            sel.update(d3.event.offsetX, true);
        } else {
            console.log("Unexpected mouse event in Selection: " + d3.event.type);
            return true;  // Propagate it, I guess. Not sure what it could be.
        }

        return false;
    }
};

Selection.prototype.height = function () {
    return $(this.svg_id).height();
};

Selection.prototype.width = function () {
    return $(this.svg_id).width();
};

Selection.prototype.destroy = function () {
    // Triggering redraw_selection with null erases the current selection.
    this.redraw(null);
    if (this.svg)
        this.svg.select("#selection").remove();
};

Selection.prototype.update = function (new_x, finalize) {
    if (this.anchor == null) return;

    // Assign the new start and end positions based on where the cursor
    // began and where it is now. This is keeping in mind that they user
    // might be dragging *left*, rather than right.
    if (!this.finalized) {
        this.start = _.min([ this.anchor, new_x ]);
        this.end = _.max([ this.anchor, new_x ]);
    }

    if (finalize) {
        this.finalized = true;
        console.log("Finalized selection at: [" + this.start + ", " + this.end + "]");
        // Tell the audio to cue up at the right spot for playback:
        var start_spot = this.start / this.width(),
            end_spot = this.end / this.width();
        this.delegate.trigger("selection:finalized", start_spot, end_spot);
        this.open_text_entry();
    }

    this.redraw();
};

Selection.prototype.open_text_entry = function () {
    if (!this.svg) return;
    if (this.anchor == null) return;

    // TODO
};

Selection.prototype.redraw = function () {
    if (!this.svg) return;

    // If we don't have an anchor, wipe the current selection:
    if (this.anchor == null) {
        this.svg.select("#selection").remove();
        return;
    }

    // If the selection rectangle isn't there already, create it:
    if (this.svg.select("#selection").empty()) {
        this.svg.append("rect")
            .attr("id", "selection");
    }

    // And now set its position:
    this.svg.select("#selection")
        .attr("x", this.start)
        .attr("y", 0)
        .attr("width", this.end - this.start)
        .attr("height", this.height());

    // TODO: Handles, etc.
};
