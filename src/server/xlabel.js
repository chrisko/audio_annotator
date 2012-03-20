// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// Label file format parsing, for xlabel-generated annotation data.

var fs = require("fs");

var HEADER_MARKER = /^#$/;  // Separates the header from the actual data.
var SEPARATOR = ";";  // Might be overridden by the header. Won't be, though.

exports.parse_xlabel_file = function (filename, cb) {
    fs.readFile(filename, "utf8", function (err, data) {
        if (err) throw err;
        cb(exports.parse_xlabel(data.split("\n")));
    });
};

// Output: {
//     header: { ... },
//     data: [
//         [ <duration>, [ <labels> ] ],
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

            var matches = lines[line].match(/^(\S+)\s+(.+)$/);
            if (!matches) throw "No matches for header line " + lines[line];
            header[matches[1]] = matches[2];
        } else {
            var matches = lines[line].match(/^\s*([\d\.]+)\s+(\d+)\s+(.+)$/);
            if (!matches) throw "No matches for line " + lines[line];
            var duration = matches[1];
            var color = matches[2];  // Useless and dumb. Ignored.
            var label = matches[3].split(SEPARATOR);
            data.push([ duration, label ]);
        }
    }

    return { "header": header,
             "data": data };
};

exports.remap_to_range = function (xlabel, range) {
    if (!range) return xlabel;  // The range may be null.

    var current = 0;
    var included = [ ];
    var i; for (i = 0; i < xlabel.data.length; i++) {
        var duration = parseFloat(xlabel.data[i][0]);
        // First check: are we within the range at the segment start?
        var in_range = (range[0] <= current && range[1] >= current);
        // Move the current marker ahead by the duration of the segment:
        current = parseFloat(current) + duration;
        // Second check: are we within the range at the segment's end?
        in_range = in_range || (range[0] <= current && range[1] >= current);

        // If this segment's within the range, calculate *how much* of it
        // was in range, and add that much to the "included" data:
        if (in_range) {
            // Start off assuming it was *all* in range:
            var how_much_in_range = duration;
            var seg_start = current - duration, seg_end = current;

            if (seg_start < range[0]) {
                // Then chop off part of the beginning (if necessary).
                how_much_in_range -= range[0] - seg_start;
            } else if (seg_end > range[1]) {
                // Or part of the end, again if necessary. Never both.
                how_much_in_range -= seg_end - range[1];
            }

            var updated_data = xlabel.data[i];
            updated_data[0] = how_much_in_range;
            included.push(updated_data);
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
