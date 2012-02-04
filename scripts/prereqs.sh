#!/bin/sh -e

CURLCMD="curl --progress-bar"

mkdir site &> /dev/null || true
cd site

mkdir data &> /dev/null || true
mkdir static &> /dev/null || true

cd static

echo "Fetching recorder.js files..."
RECORDERJS_URL=https://raw.github.com/jwagener/recorder.js
RECORDERJS_SHA1=881498c1b8dbb8b10bc480be6fbad8b723fb1895
$CURLCMD $RECORDERJS_URL/$RECORDERJS_SHA1/recorder.js > recorder.js
$CURLCMD $RECORDERJS_URL/$RECORDERJS_SHA1/recorder.swf > recorder.swf

echo "Fetching soundmanager2 files..."
SOUNDMANAGER_URL=https://raw.github.com/scottschiller/SoundManager2
SOUNDMANAGER_SHA1=fa9c78c87e75273497ac877a919660b468fb2ec1
$CURLCMD $SOUNDMANAGER_URL/$SOUNDMANAGER_SHA1/script/soundmanager2.js > soundmanager2.js
$CURLCMD $SOUNDMANAGER_URL/$SOUNDMANAGER_SHA1/swf/soundmanager2.swf > soundmanager2.swf
$CURLCMD $SOUNDMANAGER_URL/$SOUNDMANAGER_SHA1/swf/soundmanager2_debug.swf > soundmanager2_debug.swf

echo "Fetching raphael files..."
RAPHAEL_URL=https://raw.github.com/DmitryBaranovskiy/raphael
RAPHAEL_SHA1=300aa589f5a0ba7fce667cd62c7cdda0bd5ad904
$CURLCMD $RAPHAEL_URL/$RAPHAEL_SHA1/raphael.js > raphael.js

echo "Fetching jquery files..."
JQUERY_URL=http://code.jquery.com
JQUERY_VERSION=1.7
$CURLCMD $JQUERY_URL/jquery-$JQUERY_VERSION.js > jquery.js

echo "Fetching CSS..."
mkdir css &> /dev/null || true
cd css
$CURLCMD http://meyerweb.com/eric/tools/css/reset/reset.css > reset.css
$CURLCMD $SOUNDMANAGER_URL/$SOUNDMANAGER_SHA1/demo/page-player/css/page-player.css > page-player.css

cd ../../..
