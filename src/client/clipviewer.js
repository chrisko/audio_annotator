// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

function ClipViewer(clip_id, div_name) {
    //assert(typeof(clip_id) === "string");
    //assert(typeof(div_name) === "string");

    // Store the two input parameters, first off:
    this.clip_id = clip_id;
    this.div_name = div_name;

    // Then store the div, and make sure actually exists somewhere out there:
    this.div = $("#" + div_name);
    //assert(this.div.length);

    this.audio = new ClipAudio(this.div, clip_id);
    this.selection = new Selection(this.div);
    this.spectrogram = null;
    this.waveform = null;
}
