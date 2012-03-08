// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// Playmarker to show audio playback.

function Playmarker(delegate, svg_id) {
    this.delegate = delegate;
    this.svg_id = svg_id;

    this.delegate.on("audio:playing", this.update, this);
    this.delegate.on("audio:done_playing", this.reset, this);
    this.delegate.on("view:bound_to_dom", this.find_svg, this);
}

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
        .attr("x2", starting_x)

    var starting_x = pos / dur * this.width();
    var half_second_offset = 500 /* ms */
                           / dur
                           * this.width();

    this.svg.select("#playmarker")
      .transition()
        .ease("linear")
        .duration(500)
      .attr("x1", starting_x + half_second_offset)
      .attr("x2", starting_x + half_second_offset);
};

Playmarker.prototype.pause = function (pos, dur) {
    if (!this.svg) return;

    // Get rid of the current playmarker and any of its transitions:
    this.svg.select("#playmarker").remove();

    var xpos = pos / dur * this.width();

    this.svg.append("line")
        .attr("id", "playmarker")
        .attr("x1", xpos)
        .attr("y1", 0)
        .attr("x2", xpos)
        .attr("y2", this.height());
};

Playmarker.prototype.reset = function () {
    if (!this.svg) return;
    this.svg.select("#playmarker").remove();
};
