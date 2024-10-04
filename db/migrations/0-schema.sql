CREATE TABLE assignments (
  id INTEGER PRIMARY KEY,
  vehiclerequest INTEGER REFERENCES vehiclerequests ON DELETE CASCADE ON UPDATE CASCADE,
  requester INTEGER REFERENCES users ON DELETE RESTRICT ON UPDATE CASCADE,
  pickup_time INTEGER,
  return_time INTEGER,
  vehicle INTEGER REFERENCES vehicles ON UPDATE CASCADE,
  vehicle_key TEXT,
  picked_up INTEGER DEFAULT FALSE,
  returned INTEGER DEFAULT FALSE,
  response_index INTEGER DEFAULT 0
) STRICT;
CREATE TABLE clubs (
  id INTEGER PRIMARY KEY,
  name TEXT,
  active INTEGER DEFAULT TRUE
) STRICT;
CREATE TABLE users (
  id INTEGER primary key,
  cas_id TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  name TEXT,
  photo_url TEXT,
  pronoun TEXT,
  dash_number TEXT,
  allergies_dietary_restrictions TEXT,
  medical_conditions TEXT,
  clothe_size TEXT,
  shoe_size TEXT,
  is_opo INTEGER NOT NULL DEFAULT FALSE
, is_profile_complete INTEGER GENERATED ALWAYS AS (
  id IS NOT NULL AND
  email IS NOT NULL AND
  name IS NOT NULL
) VIRTUAL, height_inches INTEGER, phone TEXT, net_id TEXT) STRICT;
CREATE TABLE user_certs (
  user INTEGER REFERENCES users ON DELETE CASCADE ON UPDATE CASCADE,
  cert TEXT, -- MICROBUS, VAN, TRAILER
  is_approved INTEGER NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user, cert)
) STRICT;
CREATE TABLE vehicles (
  id INTEGER primary key,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  active INTEGER DEFAULT TRUE
) STRICT;
CREATE TABLE vehiclerequests (
  id INTEGER primary key,
  requester INTEGER NOT NULL REFERENCES users ON DELETE RESTRICT ON UPDATE CASCADE,
  request_details TEXT,
  mileage INTEGER,
  num_participants INTEGER,
  trip INTEGER REFERENCES trips ON DELETE CASCADE ON UPDATE CASCADE,
  request_type TEXT,
  is_approved INTEGER
) STRICT;
CREATE TABLE club_leaders (
  user INTEGER REFERENCES users ON DELETE CASCADE ON UPDATE CASCADE,
  club INTEGER REFERENCES clubs ON DELETE RESTRICT ON UPDATE CASCADE,
  is_approved INTEGER NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user, club)
) STRICT;
CREATE TABLE requested_vehicles (
  vehiclerequest INTEGER REFERENCES vehiclerequests ON DELETE CASCADE ON UPDATE CASCADE,
  type TEXT NOT NULL,
  details TEXT,
  pickup_time INTEGER,
  return_time INTEGER,
  trailer_needed INTEGER NOT NULL DEFAULT FALSE,
  pass_needed INTEGER NOT NULL DEFAULT FALSE
) STRICT;
CREATE TABLE trips (
  id INTEGER PRIMARY KEY,
  title TEXT DEFAULT 'Untitled trip',
  private INTEGER DEFAULT FALSE,
  past INTEGER DEFAULT FALSE,
  left INTEGER DEFAULT FALSE,
  returned INTEGER DEFAULT FALSE,
  marked_late INTEGER DEFAULT FALSE,
  club INTEGER REFERENCES clubs ON DELETE RESTRICT ON UPDATE CASCADE,
  owner INTEGER NOT NULL REFERENCES users ON DELETE RESTRICT ON UPDATE CASCADE,
  start_time INTEGER,
  end_time INTEGER,
  location TEXT,
  pickup TEXT,
  dropoff TEXT,
  cost INTEGER DEFAULT 0,
  description TEXT,
  experience_needed INTEGER DEFAULT FALSE,
  coleader_can_edit INTEGER DEFAULT FALSE,
  group_gear_approved INTEGER, -- NULL means that it's pending or N/A
  member_gear_approved INTEGER,
  sent_emails TEXT DEFAULT '[]'
, plan TEXT) STRICT;
CREATE TABLE trip_members (
  trip INTEGER REFERENCES trips ON DELETE CASCADE ON UPDATE CASCADE,
  user INTEGER REFERENCES users ON DELETE CASCADE ON UPDATE CASCADE,
  leader INTEGER DEFAULT FALSE,
  attended INTEGER DEFAULT FALSE,
  pending INTEGER DEFAULT TRUE,
  PRIMARY KEY (trip, user)
) STRICT;
CREATE TABLE trip_required_gear (
  id INTEGER PRIMARY KEY,
  trip INTEGER REFERENCES trips ON DELETE CASCADE ON UPDATE CASCADE,
  name TEXT,
  size_type TEXT
) STRICT;
CREATE TABLE member_gear_requests (
  trip INTEGER NOT NULL,
  user INTEGER NOT NULL,
  gear INTEGER NOT NULL REFERENCES trip_required_gear ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (user, gear),
  FOREIGN KEY (trip, user) REFERENCES trip_members(trip, user) ON DELETE CASCADE ON UPDATE CASCADE
) STRICT;
CREATE TABLE group_gear_requests (
  trip INTEGER REFERENCES trips ON DELETE CASCADE ON UPDATE CASCADE,
  name TEXT,
  quantity INTEGER
) STRICT;
CREATE TABLE IF NOT EXISTS "trip_pcard_requests" (
  trip INTEGER UNIQUE NOT NULL REFERENCES trips ON DELETE CASCADE ON UPDATE CASCADE,
  is_approved INTEGER,
  assigned_pcard TEXT,
  num_people INTEGER NOT NULL DEFAULT 0,
  snacks INTEGER NOT NULL DEFAULT 0,
  breakfast INTEGER NOT NULL DEFAULT 0,
  lunch INTEGER NOT NULL DEFAULT 0,
  dinner INTEGER NOT NULL DEFAULT 0,
  other_costs TEXT NOT NULL DEFAULT '[]' -- Deprecated, no longer in use
) STRICT;
CREATE TABLE IF NOT EXISTS "pcard_request_costs" (
  id INTEGER PRIMARY KEY,
  trip INTEGER REFERENCES trips ON DELETE CASCADE ON UPDATE CASCADE,
  name TEXT,
  cost INTEGER
) STRICT;
CREATE TABLE tokens (
  user INTEGER NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
) STRICT;
CREATE INDEX idx_trip ON vehiclerequests (trip);
CREATE UNIQUE INDEX user_netid_unique ON users (net_id);
