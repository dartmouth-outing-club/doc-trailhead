alter table user_certs rename to certs_vehicles;

CREATE TABLE certs_med (
  user INTEGER REFERENCES users ON DELETE CASCADE ON UPDATE CASCADE UNIQUE,
  type TEXT, 
  expiration integer, 
  PRIMARY KEY (user, type)
) STRICT;
