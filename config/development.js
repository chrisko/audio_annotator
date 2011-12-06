// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

//var root = "/Users/ckoenig/src/languishes/";
var root = "/Users/ckoenig/.jenkins/jobs/languishes/workspace/";

// Development environment configuration.
module.exports = {
    server: {
        host: "localhost",
        port: 3000,
        root: "/",
    },

    files: {
        root_dir: root,
        site_dir: root + "site/",
        data_dir: root + "site/data/",
        static_dir: root + "site/static/",
    },
};
