cat /dev/null > site/static/languishes.js
for FILE in `ls src/client/*.js`; do
    if [[ $npm_lifecycle_event != "prestart" ]]; then
        echo "Compiling $FILE..."
        cat $FILE | closure >> site/static/`basename $FILE ".js"`-min.js
        [[ $? -gt 0 ]] && exit 1
    fi

    cp $FILE site/static/`basename $FILE`
done
