BEGIN;

CREATE TABLE assignments (
  id INTEGER PRIMARY KEY,
  _id TEXT,
  vehiclerequest INTEGER REFERENCES vehiclerequests ON UPDATE CASCADE ON DELETE SET NULL,
  requester INTEGER REFERENCES users ON UPDATE CASCADE ON DELETE RESTRICT,
  pickup_time INTEGER,
  return_time INTEGER,
  vehicle INTEGER REFERENCES vehicles ON UPDATE CASCADE,
  vehicle_key TEXT,
  picked_up INTEGER DEFAULT FALSE, -- pickedUp
  returned INTEGER DEFAULT FALSE
);

CREATE TABLE clubs (
  id INTEGER PRIMARY KEY,
  _id TEXT,
  name TEXT,
  active INTEGER DEFAULT TRUE
) STRICT;

CREATE TABLE trips (
  id INTEGER PRIMARY KEY,
  _id TEXT,
  name INTEGER,
  title TEXT DEFAULT 'Untitled trip',
  private INTEGER DEFAULT FALSE,
  past INTEGER DEFAULT FALSE,
  left INTEGER DEFAULT FALSE,
  returned INTEGER DEFAULT FALSE,
  marked_late INTEGER DEFAULT FALSE, /* markedLate */
  club TEXT REFERENCES clubs ON DELETE RESTRICT ON UPDATE CASCADE,
  owner TEXT REFERENCES clubs ON DELETE RESTRICT ON UPDATE CASCADE,
  start_time INTEGER, /* startDateAndTime */
  end_time INTEGER, /* endDateAndTime */
  location TEXT,
  pickup TEXT,
  dropoff TEXT,
  cost INTEGER DEFAULT 0,
  description TEXT,
  experience_needed INTEGER DEFAULT FALSE, /* experienceNeeded */
  coleader_can_edit INTEGER DEFAULT FALSE, /* coLeaderCanEditTrip */
  opo_gear_requests TEXT, /* OPOGearRequests [{ name }, quantity }] */
  trippee_gear TEXT, /* [{}]*/
  gear_status TEXT DEFAULT 'N/A',
  trippee_gear_status TEXT DEFAULT 'N/A',
  pcard TEXT,
  pcard_status TEXT DEFAULT 'N/A', /* enum: ['pending', 'approved', 'denied', 'N/A'] */
  pcard_assigned TEXT DEFAULT 'NONE',
  vehicle_status TEXT DEFAULT 'N/A',
  sent_emails TEXT DEFAULT '[]'
) STRICT;

CREATE TABLE users (
  id INTEGER primary key,
  _id TEXT,
  cas_id TEXT UNIQUE, /* casID */
  email TEXT UNIQUE,
  password TEXT,
  name TEXT,
  photo_url TEXT,
  pronoun TEXT,
  dash_number TEXT,
  allergies_dietary_restrictions TEXT,
  medical_conditions TEXT,
  clothe_size TEXT, /*{ type: String, enum: ['Men-XS', 'Men-S', 'Men-M', 'Men-L', 'Men-XL', 'Women-XS', 'Women-S', 'Women-M', 'Women-L', 'Women-XL'] } */
  shoe_size TEXT,
  height TEXT,
  role TEXT DEFAULT 'Trippee' -- Leader, Trippee, OPO
) STRICT;

CREATE TABLE user_certs (
  user INTEGER REFERENCES users ON DELETE CASCADE ON UPDATE CASCADE,
  cert TEXT, -- MICROBUS, VAN, TRAILER
  is_approved INTEGER DEFAULT FALSE
);

CREATE TABLE vehicles (
  id INTEGER primary key,
  _id TEXT,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, /*{ enum: ['Van', 'Microbus', 'Truck', 'Enterprise', 'PersonalVehicle'] }*/
  active INTEGER DEFAULT TRUE
);

CREATE TABLE vehiclerequests (
  id INTEGER primary key,
  _id TEXT,
  requester TEXT NOT NULL REFERENCES users ON DELETE RESTRICT ON UPDATE CASCADE,
  request_details TEXT, -- requestDetails
  mileage INTEGER,
  num_participants INTEGER, -- noOfPeople
  trip TEXT REFERENCES trips ON DELETE RESTRICT ON UPDATE CASCADE, -- associatedTrip
  request_type TEXT, -- requestType { enum: ['TRIP', 'SOLO'] }
  status TEXT DEFAULT 'pending' -- { enum: ['pending', 'approved', 'denied'], },
);

CREATE TABLE club_leaders (
  user TEXT REFERENCES users ON DELETE CASCADE ON UPDATE CASCADE,
  club TEXT REFERENCES clubs ON DELETE RESTRICT ON UPDATE CASCADE,
  is_approved INTEGER DEFAULT FALSE,
  PRIMARY KEY (user, club)
) STRICT;

CREATE TABLE requested_vehicles (
  vehiclerequest INTEGER REFERENCES vehiclerequests ON DELETE CASCADE ON UPDATE CASCADE,
  type TEXT, -- vehicleType, enum: ['Van', 'Microbus', 'Truck', 'PersonalVehicle']
  details TEXT, -- vehicleDetails
  pickup_time INTEGER, -- pickupDateAndTime
  return_time INTEGER, -- returnDateAndTime
  trailer_needed INTEGER NOT NULL DEFAULT FALSE, -- trailerNeeded
  pass_needed INTEGER NOT NULL DEFAULT FALSE, -- passNeeded
  recurring_vehicle INTEGER NOT NULL DEFAULT FALSE -- recurringVehicle
);

CREATE TABLE trip_members (
  trip INTEGER REFERENCES trips ON DELETE CASCADE ON UPDATE CASCADE,
  user INTEGER REFERENCES users ON DELETE CASCADE ON UPDATE CASCADE,
  leader INTEGER DEFAULT FALSE,
  attended INTEGER DEFAULT FALSE,
  pending INTEGER DEFAULT FALSE,
  requested_gear TEXT DEFAULT '[]',
  PRIMARY KEY (trip, user)
);

COMMIT;

/* CREATE TRIGGER directions_inserted AFTER INSERT ON directions */
/* BEGIN */
/* 	UPDATE directions SET updated_at = unixepoch() WHERE id = NEW.id; */
/* END; */

/* CREATE TRIGGER directions_updated AFTER UPDATE ON directions */
/* BEGIN */
/* 	UPDATE directions SET updated_at = unixepoch() WHERE id = NEW.id; */
/* END; */

/* CREATE TRIGGER packets_inserted AFTER INSERT ON packets */
/* BEGIN */
/* 	UPDATE packets SET updated_at = unixepoch() WHERE name = NEW.name; */
/* END; */

/* CREATE TRIGGER packets_updated AFTER UPDATE ON packets */
/* BEGIN */
/* 	UPDATE packets SET updated_at = unixepoch() WHERE name = NEW.name; */
/* END; */
