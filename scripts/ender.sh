#!/bin/sh

## HTML ########################################################################
cp src/static/*.html ./site/static/
if [[ $? -ne 0 ]]; then
    echo "Error copying static HTML into place."
    exit 1
fi

## JS ##########################################################################
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
        cat $FILE | closure > site/static/js/`basename $FILE ".js"`-min.js
        [[ $? -gt 0 ]] && exit 1
    fi

    # Copy the raw (dev) version of the file over, regardless:
    cp $FILE site/static/js/`basename $FILE`
done

## CSS #########################################################################
# Then compile our less scripts into CSS:
echo | lessc - &> /dev/null
if [[ $? -ne 0 ]]; then
    echo "lessc LESS compiler not found."
    exit 1
fi

lessc --include-path="site/bootstrap/less" src/static/languishes.less \
    > site/static/css/languishes.css

if [[ $? -ne 0 ]]; then
    echo "Error compiling languishes.less into CSS."
    exit 1
fi
