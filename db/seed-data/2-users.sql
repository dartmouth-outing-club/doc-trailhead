INSERT INTO users
  (cas_id,email,password,name,photo_url,pronoun,dash_number,allergies_dietary_restrictions,medical_conditions,clothe_size,shoe_size,height_inches,is_opo)
VALUES
  ('opo.user.1@DARTMOUTH.EDU','opo.user.1@dartmouth.edu',NULL,'OPO User 1',NULL,'He/Him/His','100131029','none','none','Men-L','Men-12','74',1),
  ('leader.user.1@DARTMOUTH.EDU','leader.user.1@dartmouth.edu',NULL,'Leader User 1',NULL,'He / Him / His','100614391','None','None','Men-S','Men-9.5','72',0),
  ('trippee.user.1@DARTMOUTH.EDU','trippee.user.1@dartmouth.edu',NULL,'Trippee User 1',NULL,'He / Him / His','10084918','None','None','Men-S','Men-9.5','72',0),
  ('trippee.user.2@DARTMOUTH.EDU','trippee.user.2@dartmouth.edu',NULL,'Trippee User 2',NULL,'She / Her / Her','10013947','None','None','Women-M','Women-9.5','72',0),
  ('trippee.user.3@DARTMOUTH.EDU','trippee.user.3@dartmouth.edu',NULL,'Trippee User 3',NULL,'They / Them / Their','100428466','None','None','Women-L','Women-9.5','68',0);

INSERT INTO user_certs VALUES
  (1,'MICROBUS',1),
  (1,'VAN',1),
  (1,'TRAILER',1),
  (2,'MICROBUS',1),
  (2,'VAN',1),
  (3,'MICROBUS',1),
  (4,'MICROBUS',0),
  (5,'MICROBUS',0),
  (5,'VAN',0);

INSERT INTO club_leaders VALUES
  (1, 4, 1),
  (1, 11, 1),
  (1, 15, 1),
  (2, 4, 1),
  (3, 4, 1),
  (4, 4, 0);
