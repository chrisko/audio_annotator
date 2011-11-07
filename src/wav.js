// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// WAV audio file parsing library. Based on WAVE PCM format:
// https://ccrma.stanford.edu/courses/422/projects/WaveFormat

var assert = require("assert"),
    ctype = require("ctype"),
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
    // Make sure the raw_data's defined, and default parsed_so_far to 0.
    assert.notEqual(typeof wav.raw_data, "undefined");
    wav.parsed_so_far = wav.parsed_so_far || 0;

    var bytes_left = wav.raw_data.length - wav.parsed_so_far;
    if (bytes_left < RIFF_HEADER_SIZE) {
        throw { name: "RIFF Header Parsing Error",
             message: "Remaining space (" + bytes_left + " bytes)"
                    + " won't accommodate the " + RIFF_HEADER_SIZE
                    + "-byte RIFF header." };
    }

    var parser = new ctype.Parser({ endian: "little" });
    wav.header = parser.readData(RIFF_HEADER_FORMAT,
                                 wav.raw_data,
                                 wav.parsed_so_far);
    wav.parsed_so_far += RIFF_HEADER_SIZE;

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
    // Make sure the raw_data's defined, and default parsed_so_far to 0.
    assert.notEqual(typeof wav.raw_data, "undefined");
    wav.parsed_so_far = wav.parsed_so_far || 0;

    var bytes_left = wav.raw_data.length - wav.parsed_so_far;
    if (bytes_left < WAV_FMT_CHUNK_MIN_PCM_SIZE) {
        throw { name: "WAV FMT Parsing Error",
             message: "Remaining space (" + bytes_left + " bytes)"
                    + " can't accommodate a PCM WAV FMT chunk ("
                    + WAV_FMT_CHUNK_MIN_PCM_SIZE + " bytes)." };
    }

    var parser = new ctype.Parser({ endian: "little" });
    wav.format = parser.readData(WAV_FMT_CHUNK_FORMAT,
                                          wav.raw_data,
                                          wav.parsed_so_far);
    wav.parsed_so_far += WAV_FMT_CHUNK_MIN_PCM_SIZE;

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
    // Make sure the raw_data's defined, and default parsed_so_far to 0.
    assert.notEqual(typeof wav.raw_data, "undefined");
    wav.parsed_so_far = wav.parsed_so_far || 0;

    var bytes_left = wav.raw_data.length - wav.parsed_so_far;
    if (bytes_left < WAV_DATA_CHUNK_MIN_SIZE) {
        throw { name: "WAV DATA Parsing Error",
             message: "Remaining space (" + bytes_left + " bytes)"
                    + " won't accommodate any WAV DATA chunk (minimum "
                    + WAV_DATA_CHUNK_MIN_SIZE + " bytes)." };
    }

    var parser = new ctype.Parser({ endian: "little" });
    wav.data = parser.readData(WAV_DATA_CHUNK_FORMAT,
                                        wav.raw_data,
                                        wav.parsed_so_far);
    wav.parsed_so_far += WAV_DATA_CHUNK_MIN_SIZE;

    // Make sure the id, which begins this section, matches "DATA":
    if (wav.data.id.toString("ascii") == WAV_DATA_ID) {
        wav.data.id = WAV_DATA_ID;
    } else {
        throw { name: "WAV DATA Parsing Error",
             message: "The WAV DATA chunk begins with \""
                    + util.inspect(wav.data.id)
                    + "\", instead of \"" + WAV_DATA_ID + "\"." };
    }

    bytes_left = wav.raw_data.length - wav.parsed_so_far;
    if (bytes_left < wav.data.size) {
        throw { name: "WAV DATA Parsing Error",
             message: "The WAV DATA header specifies a size ("
                    + wav.data.size + " bytes) that's greater "
                    + "than the remaining bytes in the buffer ("
                    + bytes_left + ")." };
    }

    return true;
}

////////////////////////////////////////////////////////////////////////////////
// Timing Calculations /////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
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
}

////////////////////////////////////////////////////////////////////////////////
// Putting It All Together /////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function parse_wav(data) {
    var wav = { raw_data: data, parsed_so_far: 0 };

    // Parse the RIFF header, the FMT subchunk, and the DATA subchunk. Any of
    // these may throw, if there was a parsing error, or if something looks off.
    parse_riff_header(wav);
    parse_wav_fmt(wav);
    parse_wav_data(wav);

    calculate_timing(wav);

    return wav;  // TODO Cut some of the fields, document the output.
}

// All this module needs to export is the parse_wav method.
// Make sure we're running in Node, though, and not in the browser.
if (typeof exports !== "undefined") {
    exports.parse_wav = parse_wav;
}
