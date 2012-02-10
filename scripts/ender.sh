#!/bin/sh

# Make sure the Google Closure Compiler's available on the command line:
echo | closure &> /dev/null
if [[ $? -ne 0 ]]; then
    echo "Google Closure Compiler not found."
    exit 1
fi

# Run through all the client-side JS scripts
for FILE in `ls src/client/*.js`; do
    # Don't run the closure compile on npm start, for speed's sake.
    if [[ $npm_lifecycle_event != "prestart" ]]; then
        echo "Compiling $FILE..."
        cat $FILE | closure > site/static/`basename $FILE ".js"`-min.js
        [[ $? -gt 0 ]] && exit 1
    fi

    # Copy the raw (dev) version of the file over, regardless:
    cp $FILE site/static/`basename $FILE`
done

cp src/static/*.html ./site/static/
cp src/static/css/*.css ./site/static/css/
