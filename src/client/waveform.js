// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// Waveform audio display. Drawn up with the help of a Ruby script:
// https://github.com/benalavi/waveform/blob/master/lib/waveform.rb

// Similar to benalavi's Ruby library, we'll support two methods of rendering
// the waveform: the "peak" and "rms" methods. The "peak" waveform is what you'd
// commonly see, it's based on the maximum amplitude per sample. The "rms" way
// ("Root Mean Square") looks smoother, since it's based on a windowed average.

function Waveform(delegate, svg_id, clip_audio) {
    this.delegate = delegate;
    this.svg_id = svg_id;
    this.clip_audio = clip_audio;

    // Until we're bound to the DOM, our svg is null:
    this.svg = null;

    //this.method = "peak";  TODO

    // Subscribe to all the events we're curious in:
    this.delegate.on("audio:loaded", this.render, this);
    this.delegate.on("view:bound_to_dom", this.render, this);
}

Waveform.prototype.height = function () {
    return $(this.svg_id).height();
};

Waveform.prototype.width = function () {
    return $(this.svg_id).width();
};

Waveform.prototype.render = function () {
    // Two preconditions must be met before we render anything:
    //   1) The SVG must be bound to the DOM, or D3 won't know what to do.
    //   2) The ClipAudio data must have arrived from the server.

    // Both preconditions are tied to callbacks to render(), so if one of them
    // isn't yet met, just return and wait for the second precondition.
    if (d3.select(this.svg_id).empty()) return;
    if (!this.clip_audio.data) return;

    this.svg = d3.select(this.svg_id);

    var num_samples = this.clip_audio.data.length;
    if (num_samples < this.width())
        throw "waveform width is less than the number of samples";

    var averages = [ ];
    var highest_average = 0;
    for (var pixel = 0; pixel < this.width(); pixel++) {
        start_sample = Math.floor(num_samples * pixel / this.width());
        end_sample = Math.floor(num_samples * (pixel + 1) / this.width());

        var max = 0; var total = 0;
        for (i = start_sample; i < end_sample; i++) {
            var this_sample = this.clip_audio.data[i];
            total += this.clip_audio.data[i];
        }

        var this_average = total / (end_sample - start_sample);
        averages.push(this_average);

        highest_average = (highest_average < this_average) ? this_average
                        : (highest_average < -this_average) ? -this_average
                        : highest_average;
    }

    var path_string = "M0 " + (this.height() / 2);
    for (var pixel = 0; pixel < this.width(); pixel++) {
        var dot_height = (this.height() / 2) + (this.height() / 2)
                       * (averages[pixel] / highest_average);
        path_string += "L" + pixel + " " + dot_height;
    }

    var waveform = this.svg.append("path")
        .attr("id", "waveform")
        .attr("d", path_string);
};

Waveform.prototype.destroy = function () {
    this.svg.select("#waveform").remove();
};
