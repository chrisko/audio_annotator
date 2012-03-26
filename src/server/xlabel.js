// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// Label file format parsing, for xlabel-generated annotation data.

var assert = require("assert"),
    fs = require("fs");

var HEADER_MARKER = /^#\s*$/;  // Separates the header from the actual data.
var SEPARATOR = ";";  // Might be overridden by the header. Won't be, though.

exports.parse_xlabel_file = function (filename, cb) {
    if (filename.match(/s3504a.words$/))
        console.log("(s3504a.words is a mess, just FYI.)");

    fs.readFile(filename, "utf8", function (err, data) {
        if (err) throw err;
        cb(exports.parse_xlabel(data.split("\n")));
    });
};

// Output: {
//     header: { ... },
//     data: [
//         { start: <#>, end: <#>, label: [ "abc", "def" ] },
//         ...
//     ]
// }
exports.parse_xlabel = function (lines) {
    var header = { };
    var data = [ ];

    var reading_header = true;  // Start with the header.
    for (line in lines) {
        // Skip blank lines:
        if (!lines[line].match(/\S/)) continue;

        if (reading_header) {
            // If we've reached the end of the header, switch up:
            if (lines[line].match(HEADER_MARKER)) {
                reading_header = false;
                continue;
            }

            // A bunch of the Buckeye files don't have a space here; add it.
            if (lines[line] == "separator;") lines[line] = "separator ;";

            var matches = lines[line].match(/^(\S+)\s+(.+)\s*$/);
            if (!matches) throw "No matches for header line " + lines[line];
            header[matches[1]] = matches[2];
        } else {
            // The third column, the label, is sometimes blank. Accept it.
            var matches = lines[line].match(/^\s*([\d\-\.]+)\s+(\d+)\s*(.*)\s*$/);
            if (!matches) throw "No matches for line " + lines[line];

            // If we added a previous segment, mark its ending before anything:
            if (data.length) data[data.length - 1].end = matches[1];

            // Now add the new segment, with an as-yet-undefined "end" key:
            data.push({
                start: matches[1],
             // color: matches[2],  // This is so useless and dumb. Really.
                label: matches[3].split(SEPARATOR)
            });
        }
    }

    // The last segment (the {E_TRANS} one) is just an end marker. Its purpose
    // is to mark the ending of the last segment. Remove it here.
    assert(!data[data.length - 1].end);
    data.splice(data.length - 1, 1);

    return { "header": header,
             "data": data };
};

exports.remap_to_range = function (xlabel, range) {
    if (!range) return xlabel;  // The range may be null.

    var included = [ ];
    var i; for (i = 0; i < xlabel.data.length; i++) {
        var segment = xlabel.data[i];
        // Check if our start or end points are within the given range.
        // TODO: Swap in range-within-range logic check sometime.
        var in_range = (range[0] <= segment.start && range[1] >= segment.start)
                    || (range[0] <= segment.end   && range[1] >= segment.end);

        // If this segment's within the range, calculate *how much* of it
        // was in range, and add that much to the "included" data:
        if (in_range) {
            included.push({
                start: segment.start - range[0],
                end: segment.end - range[0],
                label: segment.label
            });
        }
    }

    return { "header": xlabel.header,
             "data": included };
};

exports.render_output = function (xlabel) {
    var output = "";
    for (i in xlabel.header) {
        output += i + " " + xlabel.header[i] + "\n";
    }

    output += "#\n";

    var color = xlabel.header["color"] || 122;
    for (i in xlabel.data) {
        var this_segment = xlabel.data[i];
        output += "   " + this_segment[0] + " " + color + " "
                + this_segment[1].join(SEPARATOR + " ") + "\n";
    }

    return output;
};
