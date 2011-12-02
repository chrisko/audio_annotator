// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// WAV audio file parsing library. Based on WAVE PCM format:
// https://ccrma.stanford.edu/courses/422/projects/WaveFormat

var assert = require("assert"),
    ctype = require("ctype"),
    fs = require("fs"),
    path = require("path"),
    util = require("util");

////////////////////////////////////////////////////////////////////////////////
// RIFF Header Parsing /////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
var RIFF_HEADER_SIZE = 12;
var RIFF_HEADER_ID = "RIFF";
var RIFF_FORMAT_WAV = "WAVE";
var RIFF_HEADER_FORMAT = [
    {     id: { type: "char[4]"  } },
    {   size: { type: "uint32_t" } },
    { format: { type: "char[4]"  } }
];

function parse_riff_header(wav) {
    // Make sure the _raw_data's defined, and default _parsed_so_far to 0.
    assert.notEqual(typeof wav._raw_data, "undefined");
    wav._parsed_so_far = wav._parsed_so_far || 0;

    var bytes_left = wav._raw_data.length - wav._parsed_so_far;
    if (bytes_left < RIFF_HEADER_SIZE) {
        throw { name: "RIFF Header Parsing Error",
             message: "Remaining space (" + bytes_left + " bytes)"
                    + " won't accommodate the " + RIFF_HEADER_SIZE
                    + "-byte RIFF header." };
    }

    var parser = new ctype.Parser({ endian: "little" });
    wav.header = parser.readData(RIFF_HEADER_FORMAT,
                                 wav._raw_data,
                                 wav._parsed_so_far);
    wav._parsed_so_far += RIFF_HEADER_SIZE;

    // Make sure the id field matches "RIFF", the container format we expect.
    if (wav.header.id.toString("ascii") == RIFF_HEADER_ID) {
        wav.header.id = RIFF_HEADER_ID;
    } else {
        throw { name: "RIFF Header Parsing Error",
             message: "The first four bytes ("
                    + util.inspect(wav.header.id)
                    + ") don't match what's required for the WAV format,"
                    + " \"" + RIFF_HEADER_ID + "\"." };
    }

    // Also ensure that the format is "WAVE" and not something else.
    if (wav.header.format.toString("ascii") == RIFF_FORMAT_WAV) {
        wav.header.format = RIFF_FORMAT_WAV;
    } else {
        throw { name: "RIFF Header Parsing Error",
             message: "The RIFF file format identifier string ("
                    + util.inspect(wav.header.format)
                    + ") doesn't match \"" + RIFF_FORMAT_WAV + "\"." };
    }
}

////////////////////////////////////////////////////////////////////////////////
// WAV FMT Parsing /////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
var WAV_FMT_CHUNK_MIN_PCM_SIZE = 24;
var WAV_FMT_ID = "fmt ";
var WAV_FMT_CHUNK_FORMAT = [
    {              id: { type: "char[4]"  } },  // Should be "FMT ".
    {            size: { type: "uint32_t" } },  // Should be 16, for PCM.
    {          format: { type: "uint16_t" } },  // Should be 1, for PCM.
    {    num_channels: { type: "uint16_t" } },  // 1 for mono, 2 for stereo.
    {     sample_rate: { type: "uint32_t" } },  // Typically 44100 Hz.
    {       byte_rate: { type: "uint32_t" } },  // Must match the other fields.
    {     block_align: { type: "uint16_t" } },  // Bytes for each timepoint.
    { bits_per_sample: { type: "uint16_t" } }   // Typically 16 bits.
];

function parse_wav_fmt(wav) {
    // Make sure the _raw_data's defined, and default _parsed_so_far to 0.
    assert.notEqual(typeof wav._raw_data, "undefined");
    wav._parsed_so_far = wav._parsed_so_far || 0;

    var bytes_left = wav._raw_data.length - wav._parsed_so_far;
    if (bytes_left < WAV_FMT_CHUNK_MIN_PCM_SIZE) {
        throw { name: "WAV FMT Parsing Error",
             message: "Remaining space (" + bytes_left + " bytes)"
                    + " can't accommodate a PCM WAV FMT chunk ("
                    + WAV_FMT_CHUNK_MIN_PCM_SIZE + " bytes)." };
    }

    var parser = new ctype.Parser({ endian: "little" });
    wav.format = parser.readData(WAV_FMT_CHUNK_FORMAT,
                                 wav._raw_data,
                                 wav._parsed_so_far);
    wav._parsed_so_far += WAV_FMT_CHUNK_MIN_PCM_SIZE;

    // Make sure the id, which begins this section, matches "FMT ":
    if (wav.format.id.toString("ascii") == WAV_FMT_ID) {
        wav.format.id = WAV_FMT_ID;
    } else {
        throw { name: "WAV FMT Parsing Error",
             message: "The WAV FMT chunk begins with \""
                    + util.inspect(wav.format.id)
                    + "\", instead of \"" + WAV_FMT_ID + "\"." };
    }

    // Calculate the block align and byte rate from the other fields,
    // to make sure everything lines up as we'd expect it to:
    var fmt = wav.format;
    var calculated_block_align = fmt.num_channels * (fmt.bits_per_sample / 8);
    var calculated_byte_rate = fmt.sample_rate * calculated_block_align;
    if (fmt.block_align !== calculated_block_align) {
        throw { name: "WAV FMT Parsing Error",
             message: "Calculated WAV block align value ("
                    + calculated_block_align + ") doesn't match the "
                    + "given value of " + fmt.block_align + "." };
    }
    if (fmt.byte_rate !== calculated_byte_rate) {
        throw { name: "WAV FMT Parsing Error",
             message: "Calculated WAV byte rate (" + calculated_byte_rate
                    + ") doesn't match the given byte rate, "
                    + fmt.byte_rate + "." };
    }
}

////////////////////////////////////////////////////////////////////////////////
// WAV DATA Parsing ////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
var WAV_DATA_CHUNK_MIN_SIZE = 8;
var WAV_DATA_ID = "data";
var WAV_DATA_CHUNK_FORMAT = [
    {   id: { type: "char[4]"  } },
    { size: { type: "uint32_t" } }
];

function parse_wav_data(wav) {
    // Make sure the _raw_data's defined, and default _parsed_so_far to 0.
    assert.notEqual(typeof wav._raw_data, "undefined");
    wav._parsed_so_far = wav._parsed_so_far || 0;

    var bytes_left = wav._raw_data.length - wav._parsed_so_far;
    if (bytes_left < WAV_DATA_CHUNK_MIN_SIZE) {
        throw { name: "WAV DATA Parsing Error",
             message: "Remaining space (" + bytes_left + " bytes)"
                    + " won't accommodate any WAV DATA chunk (minimum "
                    + WAV_DATA_CHUNK_MIN_SIZE + " bytes)." };
    }

    var parser = new ctype.Parser({ endian: "little" });
    wav.data = parser.readData(WAV_DATA_CHUNK_FORMAT,
                                        wav._raw_data,
                                        wav._parsed_so_far);
    wav._parsed_so_far += WAV_DATA_CHUNK_MIN_SIZE;

    // Make sure the id, which begins this section, matches "DATA":
    if (wav.data.id.toString("ascii") == WAV_DATA_ID) {
        wav.data.id = WAV_DATA_ID;
    } else {
        throw { name: "WAV DATA Parsing Error",
             message: "The WAV DATA chunk begins with \""
                    + util.inspect(wav.data.id)
                    + "\", instead of \"" + WAV_DATA_ID + "\"." };
    }

    bytes_left = wav._raw_data.length - wav._parsed_so_far;
    if (bytes_left < wav.data.size) {
        throw { name: "WAV DATA Parsing Error",
             message: "The WAV DATA header specifies a size ("
                    + wav.data.size + " bytes) that's greater "
                    + "than the remaining bytes in the buffer ("
                    + bytes_left + ")." };
    }

    // Store this point, the point at which samples begin, for when we need
    // to parse out the actual contents of the file later on.
    wav.samples_begin_at = wav._parsed_so_far;

    return true;
}

////////////////////////////////////////////////////////////////////////////////
// Timing Calculations /////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function get_samples(range) {
    // Range should be a two-item array. Throw if it's not.
    if (!Array.isArray(range)) {
        throw "range parameter should be an array";
    } else if (range.length != 2) {
        throw "range parameter array should have two items";
    }

    // Make sure both sample numbers in the list are within our range:
    if (range[0] < 0 || range[0] > this.num_samples)
        throw "begin index must be within [0, " + this.num_samples + "]";
    if (range[1] < 0 || range[1] > this.num_samples)
        throw "ending index must be within [0, " + this.num_samples + "]";
    // And make sure there's at least one sample in the range:
    if (range[1] <= range[0])
        throw "ending index must be greater than begin index";

    // Figure out where to start, and how many samples to parse:
    var begin_index = parseInt(this.samples_begin_at) + parseInt(range[0]);
    var samples_to_parse = range[1] - range[0];

    // Based on the bits_per_sample, get the C type of each sample:
    var sample_type = (this.format.bits_per_sample == 16) ? "int16_t"
                    : (this.format.bits_per_sample == 8) ? "int8_t"
                    : undefined;
    // And work the above C type into a ctype format definition for the parser:
    var samples_format = [
        { samples: { type: sample_type + "[" + samples_to_parse + "]" } }
    ];

    var parser = new ctype.Parser({ endian: "little" });
    var result = parser.readData(samples_format, this._raw_data, begin_index);
    var samples = result.samples;

    return samples;
}

function calculate_timing(wav) {
    // Make sure the three chunks have been parsed out successfully:
    assert.ok(typeof wav.header !== "undefined");
    assert.ok(typeof wav.format !== "undefined");
    assert.ok(typeof wav.data !== "undefined");

    // And calculate the number of samples, the sample duration in seconds, and
    // the total clip duration in seconds from the fields we've already parsed:
    wav.num_samples = wav.data.size / (wav.format.bits_per_sample / 8);
    wav.sample_duration = 1.0 / wav.format.sample_rate;
    wav.duration = wav.num_samples / wav.format.sample_rate;

    // And attach a few of the above convenience methods:
    wav.get_samples = get_samples;
}

////////////////////////////////////////////////////////////////////////////////
// Putting It All Together /////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function parse_wav(filename, on_error, on_done) {
    path.exists(filename, function (exists) {
        if (!exists) {
            return on_error("File " + filename + " does not seem to exist");
        }

        fs.readFile(filename, function (err, data) {
            if (err) return on_error(err);

            var wav = { _raw_data: data, _parsed_so_far: 0 };

            // Parse the RIFF header, the FMT subchunk, and the DATA subchunk.
            // Any of these may throw, if things go south at any point.
            parse_riff_header(wav);
            parse_wav_fmt(wav);
            parse_wav_data(wav);

            // Calculate the timing information, and add convenience methods:
            calculate_timing(wav);

            // And call the on_done method we were passed, on completion:
            return on_done(wav);
        });
    });
}

// All this module needs to export is the parse_wav method.
// Make sure we're running in Node, though, and not in the browser.
if (typeof exports !== "undefined") {
    exports.parse_wav = parse_wav;
}
