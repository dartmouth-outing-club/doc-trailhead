BEGIN {
  print "CREATE TABLE "table" (id TEXT PRIMARY KEY, blob TEXT NOT NULL);"
}

{
  # Get the id from the string
  match($0, /\$oid":"[^"]*"/)
  id = substr($0, RSTART+7, RLENGTH-8)
  # Escape all the single quotes in the JSON so we can insert it as TEXT
  gsub("'", "''")
  # Print an insert statement for the table
  print "INSERT INTO "table" (id, blob) VALUES ('"id"', '"$0"');"
}
