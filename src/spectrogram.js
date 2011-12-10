// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project
//
// Spectrogram audio display.

function Spectrogram(clip) {
    if (typeof(clip) === "undefined")
        throw "Clip required.";

    this.clip = clip;

    this.width = 800;
    this.height = 200;

    // The effective analysis width, in milliseconds.
    //   Narrow-band: 45 Hz == 29ms
    //   Wide-band:  300 Hz == 4.3ms
    this.analysis_width_ms = 10;

    // The shape of the envelope for analysis.
    //   bartlett -- Triangular.
    //   gaussian -- Normal bell curve.
    //   hamming  -- Raised sine-squared.
    //   hann     -- Sine-squared.
    //   square   -- Rectangular block.
    //   welch    -- Parabolic.
    this.window_shape = "gaussian";
};

// Based on Sound_to_Spectrogram() in the Praat codebase.
Spectrogram.prototype.draw_spectrogram = function () {
    // Grab these parameters from the clip, for convenience:
    var num_samples = this.clip.data.num_samples;
    var sample_duration = this.clip.sample_duration;
    var duration = this.clip.duration;

    // Make sure the clip duration is at least as long as one window width:
    if (duration < this.analysis_width_ms) {
        throw "Duration (" + duration + "s) shoud be at least as long as the "
            + "analysis window width (" + this.analysis_width_ms + "ms)";
    }

    // The sampling frequency, or how many samples are in one second of audio:
    var sampling_freq = 1.0 / sample_duration;
    // The Nyquist frequency is half the sampling frequency, and determines
    // the highest possible frequency this clip can unambiguously represent.
    var nyquist_freq = sampling_freq / 2;
    var max_freq = nyquist_freq;  // TODO: could also be a parameter!

    // Calculate the step to use, as we walk through the signal.
    // The 8.0 values are from Praat's TimeSoundAnalysisEditor.cpp.
    var max_time_oversampling = 8.0;  // TODO: also could be a parameter.
    var timestep = 
    // And also the frequency step, similarly:
    var max_freq_oversampling = 8.0;  // TODO: same deal.
    var freqstep = 

    // Calculate the center of the first frame:
    var t1 = 
};

Spectrogram.prototype.render = function (target_div_name) {
    this.raphael = Raphael(target_div_name, this.width, this.height);

    this.draw_spectrogram();
};
