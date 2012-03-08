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

    // TIME CALCULATIONS ///////////////////////////////////////////////////////
    // Calculate the step to use, as we walk through the signal.
    // The 8.0 values are from Praat's TimeSoundAnalysisEditor.cpp.
    var max_time_oversampling = 8.0;  // TODO: also could be a parameter.
    var timestep = this.analysis_width_ms / max_time_oversampling;
    // Now figure out how many samples fit into a window:
    var window_samples = Math.floor(this.analysis_width_ms / sample_duration);
    // TODO: should we do window_samples = ((window_samples / 2) - 1) * 2?

    // Calculate how many times we'll need to loop:
    var iterations = 1 + Math.floor(duration - this.analysis_width_ms) / timestep;
    if (iterations < 1) { throw "Clip is too short to fit multiple windows"; }
    // And calculate the center of the first frame:
    var time_of_first_sample = 0;
    var t1 = time_of_first_sample + 0.5 * ((num_samples - 1) * sample_duration - (iterations - 1) * timestep);

    // FREQUENCY CALCULATIONS //////////////////////////////////////////////////
    // Create the frequency step, similar to the timestep above:
    var max_freq_oversampling = 8.0;  // TODO: same deal, parameterize.
    // The sampling frequency, or how many samples are in one second of audio:
    var sampling_freq = 1.0 / sample_duration;
    //
    var freqstep = sampling_freq / max_freq_oversampling;
    // The Nyquist frequency is half the sampling frequency, and determines
    // the highest possible frequency this clip can unambiguously represent.
    var nyquist_freq = sampling_freq / 2;
    var max_freq = nyquist_freq;  // TODO: could also be a parameter!
};

Spectrogram.prototype.render = function (target_div_name) {
    this.draw_spectrogram();
};
