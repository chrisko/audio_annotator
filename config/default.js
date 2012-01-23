// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// default.js -- Default configuration settings. Inherited by all environments.

var root = "/var/languishes/";

module.exports = {
    server: {
        port: 3000,
    },

    db: {
        hostname: "localhost",
        port: 6379,
    },

    fs: {
        root_dir: root,
        data_dir: root + "data/",
    },
};
