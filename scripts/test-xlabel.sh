#!/bin/sh

for FILE in `find ~/src/buckeye -iname "*.phones" -or -iname "*.words"`; do
    echo Testing $FILE...

cat <<NODE | node
var xlabel = require("../src/server/xlabel.js");

xlabel.parse_xlabel_file("$FILE", function (result) {
    //console.log(result);
});
NODE

done
