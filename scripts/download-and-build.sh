# Name: download-and-build.sh
# Author: Alexander Petros
# Download the mongodb database and build it as a sqlite3 database in the same directory

set -e
DIR="$( dirname -- "${BASH_SOURCE[0]}";  )";   # Get the directory name

# Get the Mongo URI from the source root env file
export $( cat .env | grep MONGODB_URI )
if [[ -z ${MONGODB_URI+x} ]]
then
  echo "MONGODB_URI is unset. Check your .env file"
  exit 1
fi

# Reset any previous downloads and download again
rm -rf trailhead.db tables dump
mongodump --uri="$MONGODB_URI"
for file in dump/main/*.bson
do
	bsondump --outFile "$file.json" $file # convert bson into json
done

# Create the tables directory, move the files there
mkdir tables
mv dump/main/*.bson.json tables

# Run the script that inserts the JSON files into SQL
"$DIR"/create-db.sh tables/* | sqlite3 trailhead.db

# Clean up tables directory and database dump
# If you want to save the mongo stuff you can just comment this out
rm -rf tables dump
