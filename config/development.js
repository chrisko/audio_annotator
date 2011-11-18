// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

var root = "/Users/ckoenig/src/languishes/";

// Development environment configuration.
module.exports = {
    server: {
        host: "localhost",
        port: 3000,
        root: "/"
    },

    files: {
        root_dir:   root,
        data_dir:   root + "data/",
        upload_dir: root + "data/tmp/"
    }
};
