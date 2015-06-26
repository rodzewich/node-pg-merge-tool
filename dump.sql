
-- ftp://ftp.fu-berlin.de/doc/iso/iso3166-countrycodes.txt
-- https://ru.wikipedia.org/wiki/ISO_3166-1
-- https://en.wikipedia.org/?title=ISO_3166-1
-- http://www.iso.org/iso/ru/home/standards/country_codes.htm
CREATE TABLE countries_dictionary (
  id INTEGER
) WITH (
  OIDS=FALSE
);

CREATE TABLE states_dictionary (
  id INTEGER,
  country_id INTEGER
) WITH (
   OIDS=FALSE
);

CREATE TABLE cities_dictionary (
  id INTEGER,
  state_id INTEGER,
  country_id INTEGER
) WITH (
   OIDS=FALSE
);

CREATE TABLE users (
  id       INTEGER,
  login    CHARACTER VARYING(10),
  password CHARACTER VARYING(10),
  CONSTRAINT "users[id](primary)" PRIMARY KEY (id)
) WITH (
  OIDS=FALSE
);

CREATE TABLE users1 (
  id INTEGER,
  married BOOLEAN
) WITH (
  OIDS=FALSE
);

CREATE TABLE users2 (
  id INTEGER,
  married BOOLEAN
) WITH (
  OIDS=FALSE
);

CREATE TABLE users3 (
  id INTEGER,
  married BOOLEAN
) WITH (
  OIDS=FALSE
);

CREATE TABLE user_statuses_dictionary (
  id INTEGER,
  name INTEGER,
  CONSTRAINT "user_statuses_dictionary_id_primary" PRIMARY KEY (id)
) WITH (
  OIDS=FALSE
);

CREATE OR REPLACE VIEW my_view AS
 SELECT 1;
