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
DEPLOYROOT=$1
[[ -z "$1" ]] && DEPLOYROOT=/var/languishes
echo "Deploying to directory $DEPLOYROOT..."

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
# If node is up and running...
if [[ -e $DEPLOYROOT/run/languishes.pid ]]; then
    if [[ ! `wc -l $DEPLOYROOT/run/node.pid` -eq 1 ]]; then
        echo "$DEPLOYROOT/run/node.pid needs to have exactly one line."
        exit 1
    fi

    NODEPID=`cat $DEPLOYROOT/run/node.pid`
fi
