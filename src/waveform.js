// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// Waveform audio display. Drawn up with the help of a Ruby script:
// https://github.com/benalavi/waveform/blob/master/lib/waveform.rb

// Similar to benalavi's Ruby library, we'll support two methods of rendering
// the waveform: the "peak" and "rms" methods. The "peak" waveform is what you'd
// commonly see, it's based on the maximum amplitude per sample. The "rms" way
// ("Root Mean Square") looks smoother, since it's based on a windowed average.

function Waveform(clip) {
    if (typeof(clip) === "undefined")
        throw "Clip required.";

    // Input:
    this.clip = clip;

    // Defaults:
    this.width = 800;
    this.height = 200;
    this.method = "peak";
};

Waveform.prototype.update_play_marker = function (pos, dur) {
    // If there's no playmarker yet, create it as an empty Raphael set:
    if (typeof this.raphael.playmarker === "undefined") {
        this.raphael.playmarker = this.raphael.set();
    } else {
        // Otherwise, wipe out the existing playmarker:
        this.raphael.playmarker.clear();
    }

    var starting_x = pos / dur * this.width;
    var half_second_offset = 500 / this.clip.duration * this.width;

    // And draw a rectangle where we're currently playing:
    this.raphael.playmarker.push(
        this.raphael.rect(starting_x - 1, 0, 2, this.height)
            .attr({ fill: "red", "stroke-width": 0 })
            .animate({ x: starting_x + half_second_offset, opacity: 0 }, 500, "linear"));

    // TODO: remove old playmarkers periodically.
};

Waveform.prototype.draw_waveform = function () {
    var num_samples = this.clip.data.length;

    if (num_samples < this.width)
        throw "waveform width is less than the number of samples";

    var averages = [ ];
    var highest_average = 0;
    for (var pixel = 0; pixel < this.width; pixel++) {
        start_sample = Math.floor(num_samples * pixel / this.width);
        end_sample = Math.floor(num_samples * (pixel + 1) / this.width);

        var max = 0; var total = 0;
        for (i = start_sample; i < end_sample; i++) {
            var this_sample = this.clip.data[i];
            total += this.clip.data[i];
        }

        var this_average = total / (end_sample - start_sample);
        averages.push(this_average);

        highest_average = (highest_average < this_average) ? this_average
                        : (highest_average < -this_average) ? -this_average
                        : highest_average;
    }

    var path_string = "M0 " + (this.height / 2);
    for (var pixel = 0; pixel < this.width; pixel++) {
        var dot_height = (this.height / 2) + (this.height / 2)
                       * (averages[pixel] / highest_average);
        path_string += "L" + pixel + " " + dot_height;
    }

    this.raphael.path(path_string);
};

Waveform.prototype.selection_handler = function () {
    var selected_pixels = (dx > 0) ? [ x, x + dx ] : [ x + dx, x ];
    var selected_times = [
        selected_pixels[0] / this.width * this.clip.duration,
        selected_pixels[1] / this.width * this.clip.duration
    ];

    //this.raphael.selection = this.raphael.rect(
    //    selected_pixels[0], 0,
    //    selected_pixels[1], this.height
    //);
};

Waveform.prototype.attach_selection_pane = function () {
    this.selection = [ 0, this.width ];  // Start off by including everything.
    //this.raphael.selection = this.raphael.rect(0, 0, this.width, this.height)
    //    .attr({ opacity: 0.2, fill: "0xEEE" });

    //this.raphael.right_handle = this.raphael.circle( TODO
};

Waveform.prototype.render = function (target_div_name) {
    // Create the Raphael canvas in the provided div:
    this.raphael = Raphael(target_div_name, this.width, this.height);

    this.draw_waveform();
    this.attach_selection_pane();
};
