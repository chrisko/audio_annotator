// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// Playmarker to show audio playback.

function Playmarker(delegate, svg_id) {
    this.delegate = delegate;
    this.svg_id = svg_id;

    this.delegate.on("audio:playing", this.update, this);
    this.delegate.on("audio:paused", this.pause, this);
    this.delegate.on("audio:done_playing", this.pause, this);
    this.delegate.on("selection:finalized", this.pause, this);
    this.delegate.on("view:bound_to_dom", this.find_svg, this);
}

Playmarker.prototype.destroy = function () {
    // Should be taken care of.
};

Playmarker.prototype.find_svg = function () {
    var svg = d3.select(this.svg_id);
    if (svg.empty()) throw "No SVG element " + this.svg_id + " found!";
    this.svg = svg;
};

Playmarker.prototype.height = function () {
    return $(this.svg_id).height();
};

Playmarker.prototype.width = function () {
    return $(this.svg_id).width();
};

Playmarker.prototype.update = function (pos, dur) {
    if (!this.svg) return;

    var starting_x = pos / dur * this.width();

    if (this.svg.select("#playmarker").empty()) {
        this.svg.append("line")
            .attr("id", "playmarker")
            .attr("y1", 0)
            .attr("y2", this.height());
    }

    this.svg.select("#playmarker")
        .attr("x1", starting_x)
        .attr("x2", starting_x);

    var offset_ms = 250;
    var starting_x = pos / dur * this.width();
    var x_offset = offset_ms / dur * this.width();

    this.svg.select("#playmarker")
      .transition()
        .duration(offset_ms)
        .ease("linear")
        .attr("x1", starting_x + x_offset)
        .attr("x2", starting_x + x_offset);
};

Playmarker.prototype.pause = function (where) {
    if (!this.svg) return;
    if (this.svg.select("#playmarker").empty()) {
        this.svg.append("line")
            .attr("id", "playmarker")
            .attr("y1", 0)
            .attr("y2", this.height());
    }

    var xpos = where * this.width();

    // Render it invisible while we remove any transitions on it:
    //this.svg.select("#playmarker").attr("visible", false);
    // Use an empty transition of duration 0 to override any others:
    this.svg.select("#playmarker")
      .transition()
        .duration(0)
        .ease("linear")
        .attr("x1", xpos)
        .attr("x2", xpos);
};

Playmarker.prototype.reset = function () {
    if (!this.svg) return;
    this.svg.select("#playmarker").remove();
};
