cat /dev/null > site/static/languishes.js
for FILE in `ls src/client/*.js`; do
    echo "Compiling $FILE..."
    cat $FILE | closure > /dev/null
    [[ $? -gt 0 ]] && exit 1

    cat $FILE | closure >> site/static/`basename $FILE ".js"`-min.js
    cp $FILE site/static/`basename $FILE`
done
