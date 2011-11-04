#!/bin/zsh
# Deploy script. Moves files from the build directory into the specified
# deployment root, and restarts all the services. Can work from scratch.

################################################################################
## Check the arguments and do some prep work ###################################
################################################################################
USAGE="usage: $0 [debug|prod]"
[[ "$1" = "-h" ]] && { echo $USAGE; exit 0; }
[[ ! -z "$2" ]] && { echo $USAGE; exit 1; }

# Get the target environment (test or prod) information:
TARGETENV=$1
[[ -z "$1" ]] && TARGETENV=debug
echo "Deploying to $TARGETENV..."

ENVCONFIG=./conf/$TARGETENV.yml
# Read the target environment's config file, for where to deploy to:
[[ ! -d ./conf/ ]] && { echo "Can't find ./conf/ directory."; exit 1; }
[[ ! -e $ENVCONFIG ]] && { echo "Can't find $ENVCONFIG."; exit 1; }
if [[ `grep "^rootdir: " $ENVCONFIG | wc -l | awk '{print $1}'` -eq 0 ]]; then
    echo "$ENVCONFIG doesn't seem to specify a rootdir parameter."
    exit 1
fi

# And now extract that rootdir parameter from the environment config:
DEPLOYROOT=`grep "^rootdir: " $ENVCONFIG | sed "s/^rootdir: \"\(.*\)\"$/\1/"`

################################################################################
## Check or create the deployment directories ##################################
################################################################################
# Create the deployment directory, if it doesn't already exist:
if [[ ! -d $DEPLOYROOT ]]; then
    echo "Deployment root directory $DEPLOYROOT doesn't exist. Creating..."
    mkdir $DEPLOYROOT
    [[ $? -gt 0 ]] && { echo "Failed to create $DEPLOYROOT."; exit 1; }
    echo "Created deployment root directory."
fi

# Create the subdirectories, if they don't already exist:
for SUBDIR in conf data logs run; do
    if [[ ! -d $DEPLOYROOT/$SUBDIR ]]; then
        echo "Creating $DEPLOYROOT/$SUBDIR directory..."
        mkdir $DEPLOYROOT/$SUBDIR
        [[ $? -gt 0 ]] && {
            echo "Failed to create $DEPLOYROOT/$SUBDIR."
            exit 1
        }
    fi
done

################################################################################
## Copy over the source ########################################################
################################################################################
if [[ ! -d src/site ]]; then
    echo "Cannot find HTML source directory, src/site."
    exit 1
fi

# -c : Skip based on checksum, not modtime and size.
# -r : Recurse into directories.
# -t : Preserve times.
# --delete : Delete extraneous files from destination directories.
rsync -crt --delete src/site/ $DEPLOYROOT/site/

cp src/recorder.js/recorder.* $DEPLOYROOT/site/

################################################################################
## Copy over the config ########################################################
################################################################################
mustache -v &> /dev/null
if [[ $? -ne 0 ]]; then
    echo "Cannot find mustache on your PATH. Try gem install mustache."
    exit 1
fi

# Wipe out each of the config files with the Mustached versions:
for FILE in `ls conf/`; do
    mustache conf/debug.yml conf/$FILE > $DEPLOYROOT/conf/$FILE
done

################################################################################
## Restart the running processes ###############################################
################################################################################
# If nginx is running (check for a .pid file), send it a HUP to reload config:
if [[ -e $DEPLOYROOT/run/nginx.pid ]]; then
    if [[ `wc -l $DEPLOYROOT/run/nginx.pid | awk '{print $1}'` -ne 1 ]]; then
        echo "$DEPLOYROOT/run/nginx.pid needs to have exactly one line."
        exit 1
    fi

    NGINXPID=`cat $DEPLOYROOT/run/nginx.pid`
    echo "nginx is running under process $NGINXPID. Reloading..."
    nginx -c $DEPLOYROOT/conf/nginx.conf -s reload
else
    #nginx -c $DEPLOYROOT/conf/nginx.conf -s start  # TODO Do through launchctl.
    echo "TODO: start nginx"
fi

# If node is up and running...
if [[ -e $DEPLOYROOT/run/node.pid ]]; then
    if [[ ! `wc -l $DEPLOYROOT/run/node.pid` -eq 1 ]]; then
        echo "$DEPLOYROOT/run/node.pid needs to have exactly one line."
        exit 1
    fi

    NODEPID=`cat $DEPLOYROOT/run/node.pid`
fi
