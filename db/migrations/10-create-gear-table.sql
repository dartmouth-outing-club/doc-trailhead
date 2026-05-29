-- TODO: each of these needs to have better data handling 
-- also eventully change wording of type and class. maybe add descriptions/tags?
CREATE TABLE gear (
  id INTEGER primary key,
  name TEXT UNIQUE NOT NULL,
  class TEXT NOT NULL,
  description TEXT,
  type TEXT,
  quantity INTEGER NOT NULL,
  rental_fee INTEGER NOT NULL DEFAULT 0,
  replacement_fee INTEGER NOT NULL DEFAULT 0
  active INTEGER DEFAULT TRUE,
) STRICT;
--TODO: add column for "available outside of DOC trips?"


--alter table group_gear_requests add column is_approved integer NOT NULL default 0;
--alter table member_gear_requests add column is_approved integer NOT NULL default 0;

--alter table group_gear_requests add column gear_id INTEGER references gear(id) on update cascade;
--alter table member_gear_requests add column gear_id INTEGER references gear(id) on update cascade;
