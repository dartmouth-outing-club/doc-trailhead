set -e
DIR="$( dirname -- "${BASH_SOURCE[0]}"; )";  # Get the directory name

for file in "$@"
do
  tablename=`basename $file .bson.json`
  awk -f "$DIR"/parse-db.awk -v table="$tablename" "$file"
done
