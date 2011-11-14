// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// Waveform audio display. Drawn up with the help of a Ruby script:
// https://github.com/benalavi/waveform/blob/master/lib/waveform.rb

// Similar to benalavi's Ruby library, we'll support two methods of rendering
// the waveform: the "peak" and "rms" methods. The "peak" waveform is what you'd
// commonly see, it's based on the maximum amplitude per sample. The "rms" way
// ("Root Mean Square") looks smoother, since it's based on a windowed average.

function draw_waveform(wav) {
    for (var pixel = 0; pixel < this.width; pixel++) {
        start_sample = Math.floor(wav.num_samples * pixel / this.width);
        end_sample = Math.floor(wav.num_samples * (pixel + 1) / this.width);
        console.log("pixel " + pixel + ":");
        console.log("  start: " + start_sample + "/" + wav.num_samples);
        console.log("  end: " + end_sample + "/" + wav.num_samples);
    }
}
