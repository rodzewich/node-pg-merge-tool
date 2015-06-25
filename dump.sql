
/* импортируемые таблицы */

CREATE TABLE users (
  id INTEGER,
  married BOOLEAN,
  CONSTRAINT "users_id_primary" PRIMARY KEY (id)
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

CREATE TABLE countries_dictionary (
  id INTEGER,
  name INTEGER,
  CONSTRAINT "countries_dictionary_id_primary" PRIMARY KEY (id)
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
