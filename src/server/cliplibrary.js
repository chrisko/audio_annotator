// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// cliplibrary.js -- Clip Library Manager

var fs = require("fs"),
    path = require("path");

////////////////////////////////////////////////////////////////////////////////
// Synchronously initialize the clip library.
function ClipLibrary(dirname) {
    if (typeof(dir) !== "string")
        throw { name: "ClipLibrary initialization error",
                description: "Directory name required." };

    // Store the normalized directory name. Make it absolute, if it wasn't.
    this.directory_name = path.resolve(process.cwd(), dirname);
    // Make sure it already exists; don't create directories willy-nilly.
    if (!path.existsSync(this.directory_name)) {
        throw { name: "ClipLibrary initialization error",
                description: "Directory " + dirname + " doesn't exist." };
    }

    // If the "new uploads" directory doesn't already exist, create it.
    // NB, these fs sync commands will throw if anything goes south.
    if (!path.existsSync(this.get_new_uploads_dir())) {
        fs.mkdirSync(this.get_new_uploads_dir(), "0755");
    };

    // Now audit the contents
    this.audit_contents(true);
}

// Synchronously audit the contents of the library directory, to check for
// existing files. If the in_detail flag's set, computes checksums too.
ClipLibrary.prototype.audit_contents() {
    t
}

ClipLibrary.prototype.get_new_uploads_dir() {
    return this.directory_name + "/new";
}

ClipLibrary.prototype.add_new_clip(clip_stream) {
}

ClipLibrary.prototype.get_clip_location
