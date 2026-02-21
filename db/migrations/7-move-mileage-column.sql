ALTER TABLE vehiclerequests
DROP COLUMN mileage;

ALTER TABLE requested_vehicles
ADD COLUMN mileage INTEGER;

