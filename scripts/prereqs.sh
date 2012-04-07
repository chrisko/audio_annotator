#!/bin/sh -e

CURLCMD="curl --progress-bar"
TOPDIR=`pwd`

SITEDIR=$TOPDIR/site
mkdir $SITEDIR &> /dev/null || true

mkdir $SITEDIR/data &> /dev/null || true
mkdir $SITEDIR/data/new &> /dev/null || true

STATICDIR=$SITEDIR/static
mkdir $STATICDIR &> /dev/null || true

## JS ##########################################################################
# Store all the downloaded files in our static directory:
cd $STATICDIR
mkdir css  &> /dev/null || true
mkdir font &> /dev/null || true
mkdir js   &> /dev/null || true
mkdir swf  &> /dev/null || true

if [[ ! -f js/recorder.js || ! -f swf/recorder.swf ]]; then
    echo "Fetching recorder.js files..."
    RECORDERJS_URL=https://raw.github.com/jwagener/recorder.js
    RECORDERJS_SHA1=881498c1b8dbb8b10bc480be6fbad8b723fb1895
    $CURLCMD $RECORDERJS_URL/$RECORDERJS_SHA1/recorder.js > js/recorder.js
    $CURLCMD $RECORDERJS_URL/$RECORDERJS_SHA1/recorder.swf > swf/recorder.swf
fi

if [[ `find . -iname "soundmanager*" | wc -l` -lt 4 ]]; then
    echo "Fetching soundmanager2 files..."
    SOUNDMANAGER_URL=https://raw.github.com/scottschiller/SoundManager2
    SOUNDMANAGER_SHA1=ba28eeaeb33bfa861dcb69383d8d14be91b68395
    FETCHCMD="$CURLCMD $SOUNDMANAGER_URL/$SOUNDMANAGER_SHA1"
    $FETCHCMD/script/soundmanager2.js > js/soundmanager2.js
    $FETCHCMD/script/soundmanager2-nodebug-jsmin.js > js/soundmanager2-nodebug-jsmin.js
    $FETCHCMD/swf/soundmanager2.swf > swf/soundmanager2.swf
    $FETCHCMD/swf/soundmanager2_debug.swf > swf/soundmanager2_debug.swf
fi

if [[ ! -f js/d3.js ]]; then
    echo "Fetching d3 files..."
    D3_URL=https://raw.github.com/mbostock/d3
    D3_SHA1=af2af6ac9080529d102aacfa57807371fd983d2b
    $CURLCMD $D3_URL/$D3_SHA1/d3.v2.js > js/d3.js
fi

if [[ ! -f js/jquery.js ]]; then
    echo "Fetching jquery files..."
    JQUERY_URL=http://code.jquery.com
    JQUERY_VERSION=1.7.1
    $CURLCMD $JQUERY_URL/jquery-$JQUERY_VERSION.js > js/jquery.js
fi

if [[ ! -f js/underscore.js || ! -f js/underscore-min.js ]]; then
    echo "Fetching underscore files..."
    UNDERSCORE_URL=http://documentcloud.github.com/underscore
    $CURLCMD $UNDERSCORE_URL/underscore.js > js/underscore.js
    $CURLCMD $UNDERSCORE_URL/underscore-min.js > js/underscore-min.js
fi

if [[ ! -f js/backbone.js || ! -f js/backbone-min.js ]]; then
    echo "Fetching backbone files..."
    BACKBONE_URL=http://documentcloud.github.com/backbone
    $CURLCMD $BACKBONE_URL/backbone.js > js/backbone.js
    $CURLCMD $BACKBONE_URL/backbone-min.js > js/backbone-min.js
fi

if [[ ! -f js/LAB.js ]]; then
    echo "Fetching LAB.js..."
    LABJS_URL=https://raw.github.com/getify/LABjs
    $CURLCMD $LABJS_URL/master/LAB.js > js/LAB.js
fi

## CSS #########################################################################
if [[ ! -f css/reset.css ]]; then
    echo "Fetching reset.css..."
    $CURLCMD http://meyerweb.com/eric/tools/css/reset/reset.css > css/reset.css
fi

## Font ########################################################################
if [[ `ls font/ | wc -l` -eq 0 ]]; then
    echo "Fetching Font Awesome..."
    FONTAWESOME_URL=https://raw.github.com/FortAwesome/Font-Awesome
    FONTAWESOME_SHA1=563a6f3cba56ac802af9d898c5b9a3401e6faabf
    # Grab the CSS first:
    $CURLCMD $FONTAWESOME_URL/$FONTAWESOME_SHA1/css/font-awesome.css > css/font-awesome.css
    # Then all the various font types, of which there are many:
    for EXT in eot svg svgz ttf woff; do
        FILENAME=fontawesome-webfont.$EXT
        $CURLCMD $FONTAWESOME_URL/$FONTAWESOME_SHA1/font/$FILENAME > font/$FILENAME
    done
fi

## Bootstrap ###################################################################
cd $SITEDIR
if [[ ! -d bootstrap ]]; then
    echo "Fetching and unzipping bootstrap..."
    BOOTSTRAP_URL=http://twitter.github.com/bootstrap
    $CURLCMD $BOOTSTRAP_URL/assets/bootstrap.zip > bootstrap.zip

    unzip -q bootstrap.zip
    cp bootstrap/css/* $STATICDIR/css
    cp bootstrap/js/* $STATICDIR/js
fi

# Don't forget to return us to that top-level directory.
cd $TOPDIR
