#!/bin/sh

# Sample randomly from the Buckeye corpus.

SECONDS=5

RANDOMFILES=`find ~/src/buckeye/data -type f -iname "*.wav" \
           | perl -MList::Util=shuffle -e 'print shuffle(<STDIN>);' | head`

for FILE in $RANDOMFILES; do
    SAMPLES=$(soxi $FILE | perl -ne "print \"\$1\n\" if /(\d+) samples/")
    # Get the duration, from $SECONDS above (and a sample rate of 16000):
    DURATION=$(perl -e "print $SECONDS * 16000 . \"\n\"")
    # And calculate out a random start time, to clip the sample from:
    START=$(perl -e "print int(rand($SAMPLES - $DURATION)) . \"\n\"")

    # And finally, splice out the clip we're interested in:
    sox $FILE site/data/$(basename $FILE ".wav").${START}s.wav trim ${START}s ${DURATION}s
done
