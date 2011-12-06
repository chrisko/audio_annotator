// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// Waveform audio display. Drawn up with the help of a Ruby script:
// https://github.com/benalavi/waveform/blob/master/lib/waveform.rb

// Similar to benalavi's Ruby library, we'll support two methods of rendering
// the waveform: the "peak" and "rms" methods. The "peak" waveform is what you'd
// commonly see, it's based on the maximum amplitude per sample. The "rms" way
// ("Root Mean Square") looks smoother, since it's based on a windowed average.

function Waveform(clip_data) {
    if (typeof(clip_data) === "undefined") {
        throw "Clip information required.";
    }

    this.data = clip_data;
    this.width = 800;
    this.height = 200;
    this.method = "peak";
}

Waveform.prototype.render = function (r) {
    var num_samples = this.data.length;

    if (num_samples < this.width)
        throw "waveform width is less than the number of samples";

    var averages = [ ];
    var highest_average = 0;
    for (var pixel = 0; pixel < this.width; pixel++) {
        start_sample = Math.floor(num_samples * pixel / this.width);
        end_sample = Math.floor(num_samples * (pixel + 1) / this.width);

        var max = 0; var total = 0;
        for (i = start_sample; i < end_sample; i++) {
            var this_sample = this.data[i];

            total += this.data[i];
        }

        var this_average = total / (end_sample - start_sample);
        averages.push(this_average);

        highest_average = (highest_average < this_average) ? this_average
                        : (highest_average < -this_average) ? -this_average
                        : highest_average;
    }

    var path_string = "M0 " + (this.height / 2);
    for (var pixel = 0; pixel < this.width; pixel++) {
        var dot_height = (this.height / 2) + (this.height / 2) * (averages[pixel] / highest_average);
        path_string += "L" + pixel + " " + dot_height;
        //r.circle(pixel, dot_height, 1);
    }
    r.path(path_string);
};
