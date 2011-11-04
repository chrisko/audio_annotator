#!/bin/zsh -e
# Build test script, to be run by Jenkins to make sure all our configs are
# sane and all files check out okay with what we expect.

################################################################################
# First, make sure ngircd is in our PATH, so we can test its config:
if [[ `ngircd -V 2> /dev/null | grep -i barton | wc -l` -eq 0 ]]; then
    echo "Looks like ngircd isn't installed, or at least isn't in your PATH."
    # Don't actually fail the job here. The irc channel isn't really important.
else
    # Print the actual version, for reference, making sure not to fail the job.
    ngircd -V || true

    # Make sure there's an ngircd file to test, first:
    if [[ -e $WORKSPACE/conf/ngircd.conf ]]; then
        # Ask ngircd to test the config, to make sure it's sane:
        ngircd --config $WORKSPACE/conf/ngircd.conf --configtest
    fi
fi

################################################################################
# Now, check the nginx config in almost the same way; "almost" because nginx
# actually does the right thing after displaying its version, and returns zero.
nginx -v
if [[ -e $WORKSPACE/conf/nginx.conf ]]; then
    # Ask nginx to test the config file, output some stuff, and return.
    nginx -c $WORKSPACE/conf/nginx.conf -t
fi

################################################################################
mustache -v &> /dev/null
if [[ $? -ne 0 ]]; then
    echo "Cannot find mustache on your PATH. Try gem install mustache."
    exit 1
fi
