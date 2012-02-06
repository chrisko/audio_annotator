#!/bin/sh -e

CURLCMD="curl --progress-bar"

mkdir site &> /dev/null || true
cd site

mkdir data &> /dev/null || true
mkdir static &> /dev/null || true

cd static

## JS ##########################################################################
if [[ ! -f recorder.js || ! -f recorder.swf ]]; then
    echo "Fetching recorder.js files..."
    RECORDERJS_URL=https://raw.github.com/jwagener/recorder.js
    RECORDERJS_SHA1=881498c1b8dbb8b10bc480be6fbad8b723fb1895
    $CURLCMD $RECORDERJS_URL/$RECORDERJS_SHA1/recorder.js > recorder.js
    $CURLCMD $RECORDERJS_URL/$RECORDERJS_SHA1/recorder.swf > recorder.swf
fi

if [[ ! -f soundmanager2.js || ! -f soundmanager2.swf || ! -f soundmanager2_debug.swf ]]; then
    echo "Fetching soundmanager2 files..."
    SOUNDMANAGER_URL=https://raw.github.com/scottschiller/SoundManager2
    SOUNDMANAGER_SHA1=fa9c78c87e75273497ac877a919660b468fb2ec1
    $CURLCMD $SOUNDMANAGER_URL/$SOUNDMANAGER_SHA1/script/soundmanager2.js > soundmanager2.js
    $CURLCMD $SOUNDMANAGER_URL/$SOUNDMANAGER_SHA1/swf/soundmanager2.swf > soundmanager2.swf
    $CURLCMD $SOUNDMANAGER_URL/$SOUNDMANAGER_SHA1/swf/soundmanager2_debug.swf > soundmanager2_debug.swf
fi

if [[ ! -f raphael.js ]]; then
    echo "Fetching raphael files..."
    RAPHAEL_URL=https://raw.github.com/DmitryBaranovskiy/raphael
    RAPHAEL_SHA1=300aa589f5a0ba7fce667cd62c7cdda0bd5ad904
    $CURLCMD $RAPHAEL_URL/$RAPHAEL_SHA1/raphael.js > raphael.js
fi

if [[ ! -f jquery.js ]]; then
    echo "Fetching jquery files..."
    JQUERY_URL=http://code.jquery.com
    JQUERY_VERSION=1.7
    $CURLCMD $JQUERY_URL/jquery-$JQUERY_VERSION.js > jquery.js
fi

if [[ ! -f underscore.js || ! -f underscore-min.js ]]; then
    UNDERSCORE_URL=http://documentcloud.github.com/underscore
    $CURLCMD $UNDERSCORE_URL/underscore.js > underscore.js
    $CURLCMD $UNDERSCORE_URL/underscore-min.js > underscore-min.js
fi

if [[ ! -f backbone.js || ! -f backbone-min.js ]]; then
    BACKBONE_URL=http://documentcloud.github.com/backbone
    $CURLCMD $BACKBONE_URL/backbone.js > backbone.js
    $CURLCMD $BACKBONE_URL/backbone-min.js > backbone-min.js
fi

## CSS #########################################################################
mkdir css &> /dev/null || true
cd css

if [[ ! -f reset.css || ! -f page-player.css ]]; then
    echo "Fetching CSS..."
    $CURLCMD http://meyerweb.com/eric/tools/css/reset/reset.css > reset.css
    $CURLCMD $SOUNDMANAGER_URL/$SOUNDMANAGER_SHA1/demo/page-player/css/page-player.css > page-player.css
fi

cd ../../..
