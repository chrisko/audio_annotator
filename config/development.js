// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

var root = "/Users/ckoenig/src/languishes/";

// Development environment configuration.
module.exports = {
    server: {
        host: "languishes.net",
        port: 3000
    },

    files: {
        root_dir:   root,
        data_dir:   root + "data/",
        upload_dir: root + "data/tmp/"
    }
};
