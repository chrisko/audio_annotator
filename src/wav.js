// https://ccrma.stanford.edu/courses/422/projects/WaveFormat

var assert = require("assert"),
    ctype = require("ctype");

// Convenience method for some of the error messages below.
function bufstring(buffer) {
    var chars = [ ];
    for (var i = 0; i < buffer.length; i++)
        chars.push(buffer[i]);
    return chars.join(" ");
}

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

function parse_riff_header(intermediary) {
    // Make sure the raw_data's defined, and default parsed_so_far to 0.
    assert.notEqual(typeof intermediary.raw_data, "undefined");
    intermediary.parsed_so_far = intermediary.parsed_so_far || 0;

    var bytes_left = intermediary.raw_data.length - intermediary.parsed_so_far;
    if (bytes_left < RIFF_HEADER_SIZE) {
        intermediary.error = "Remaining space (" + bytes_left + " bytes)"
                           + " won't accommodate the " + RIFF_HEADER_SIZE
                           + "-byte RIFF header.";
        return false;
    }

    var parser = new ctype.Parser({ endian: "little" });
    intermediary.header = parser.readData(RIFF_HEADER_FORMAT,
                                          intermediary.raw_data,
                                          intermediary.parsed_so_far);
    intermediary.parsed_so_far += RIFF_HEADER_SIZE;

    // Make sure the id field matches "RIFF", the container format we expect.
    if (intermediary.header.id.toString("ascii") == RIFF_HEADER_ID) {
        intermediary.header.id = RIFF_HEADER_ID;
    } else {
        intermediary.error = "The first four bytes ("
                           + bufstring(intermediary.header.id)
                           + ") don't match what's required for the WAV format,"
                           + " \"" + RIFF_HEADER_ID + "\".";
        return false;
    }

    // Also ensure the format is "WAVE" and not something else.
    if (intermediary.header.format.toString("ascii") == RIFF_FORMAT_WAV) {
        intermediary.header.format = RIFF_FORMAT_WAV;
    } else {
        intermediary.error = "The RIFF file format identifier string ("
                           + bufstring(intermediary.header.format)
                           + ") doesn't match \"" + RIFF_FORMAT_WAV + "\".";
        return false;
    }

    return true;
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

function parse_wav_fmt(intermediary) {
    // Make sure the raw_data's defined, and default parsed_so_far to 0.
    assert.notEqual(typeof intermediary.raw_data, "undefined");
    intermediary.parsed_so_far = intermediary.parsed_so_far || 0;

    var bytes_left = intermediary.raw_data.length - intermediary.parsed_so_far;
    if (bytes_left < WAV_FMT_CHUNK_MIN_PCM_SIZE) {
        intermediary.error = "Remaining space (" + bytes_left + " bytes)"
                           + " can't accommodate a PCM WAV FMT chunk ("
                           + WAV_FMT_CHUNK_MIN_PCM_SIZE + " bytes).";
        return false;
    }

    var parser = new ctype.Parser({ endian: "little" });
    intermediary.format = parser.readData(WAV_FMT_CHUNK_FORMAT,
                                          intermediary.raw_data,
                                          intermediary.parsed_so_far);
    intermediary.parsed_so_far += WAV_FMT_CHUNK_MIN_PCM_SIZE;

    // Make sure the id, which begins this section, matches "FMT ":
    if (intermediary.format.id.toString("ascii") == WAV_FMT_ID) {
        intermediary.format.id = WAV_FMT_ID;
    } else {
        intermediary.error = "The WAV FMT chunk begins with \""
                           + bufstring(intermediary.format.id)
                           + "\", instead of \"" + WAV_FMT_ID + "\".";
        return false;
    }

    // Calculate the block align and byte rate from the other fields,
    // to make sure everything lines up as we'd expect it to:
    var fmt = intermediary.format;
    var calculated_block_align = fmt.num_channels * (fmt.bits_per_sample / 8);
    var calculated_byte_rate = fmt.sample_rate * calculated_block_align;
    if (fmt.block_align !== calculated_block_align) {
        intermediary.error = "Calculated WAV block align value ("
                           + calculated_block_align + ") doesn't match the "
                           + "given value of " + fmt.block_align + ".";
        return false;
    }
    if (fmt.byte_rate !== calculated_byte_rate) {
        intermediary.error = "Calculated WAV byte rate (" + calculated_byte_rate
                           + ") doesn't match the given byte rate, "
                           + fmt.byte_rate + ".";
        return false;
    }

    return true;
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

function parse_wav_data(intermediary) {
    // Make sure the raw_data's defined, and default parsed_so_far to 0.
    assert.notEqual(typeof intermediary.raw_data, "undefined");
    intermediary.parsed_so_far = intermediary.parsed_so_far || 0;

    var bytes_left = intermediary.raw_data.length - intermediary.parsed_so_far;
    if (bytes_left < WAV_DATA_CHUNK_MIN_SIZE) {
        intermediary.error = "Remaining space (" + bytes_left + " bytes)"
                           + " won't accommodate any WAV DATA chunk (minimum "
                           + WAV_DATA_CHUNK_MIN_SIZE + " bytes).";
        return false;
    }

    var parser = new ctype.Parser({ endian: "little" });
    intermediary.data = parser.readData(WAV_DATA_CHUNK_FORMAT,
                                        intermediary.raw_data,
                                        intermediary.parsed_so_far);
    intermediary.parsed_so_far += WAV_DATA_CHUNK_MIN_SIZE;

    // Make sure the id, which begins this section, matches "DATA":
    if (intermediary.data.id.toString("ascii") == WAV_DATA_ID) {
        intermediary.data.id = WAV_DATA_ID;
    } else {
        intermediary.error = "The WAV DATA chunk begins with \""
                           + bufstring(intermediary.data.id)
                           + "\", instead of \"" + WAV_DATA_ID + "\".";
        return false;
    }

    bytes_left = intermediary.raw_data.length - intermediary.parsed_so_far;
    if (bytes_left < intermediary.data.size) {
        intermediary.error = "The WAV DATA header specifies a size ("
                           + intermediary.data.size + " bytes) that's greater "
                           + "than the remaining bytes in the buffer ("
                           + bytes_left + ").";
        return false;
    }

    return true;
}

////////////////////////////////////////////////////////////////////////////////
// The Actual Parse Method /////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function parse_wav(data) {
    var intermediary = { raw_data: data, parsed_so_far: 0 };

    parse_riff_header(intermediary)
        && parse_wav_fmt(intermediary)
        && parse_wav_data(intermediary);

    if (intermediary.error) {
        throw new Error(intermediary.error);
    }

    return intermediary;  // TODO Cut some of the fields, improve a bit.
}

// Export the parse_wav method to client modules:
exports.parse_wav = parse_wav;
