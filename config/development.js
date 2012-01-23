// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// development.js -- Development deployment configuration settings.
// (The deployment type is found in $NODE_ENV, and defaults to "development".)

var root = "/Users/ckoenig/src/languishes/";

// Development environment configuration.
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
        site_dir: root + "site/",
        data_dir: root + "site/data/",
        static_dir: root + "site/static/",
    },
};
