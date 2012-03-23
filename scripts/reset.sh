#!/bin/sh

# Remove all the site data:
find site/data -type f | xargs rm
# And flush the redis database:
echo "flushdb" | redis-cli
