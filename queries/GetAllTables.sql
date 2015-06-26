-- get all tables

SELECT rel.relname,
       rel.reltablespace AS spcoid,
       spc.spcname,
       pg_get_userbyid(rel.relowner) AS relowner,
       rel.relacl,
       rel.relhasoids,
       rel.relhassubclass,
       rel.reltuples,
       des.description,
       con.conname,
       con.conkey,
       EXISTS(
           SELECT 1 FROM pg_trigger
             JOIN pg_proc pt
               ON pt.oid=tgfoid
              AND pt.proname='logtrigger'
             JOIN pg_proc pc
               ON pc.pronamespace=pt.pronamespace
              AND pc.proname='slonyversion'
            WHERE tgrelid=rel.oid
       ) AS isrepl,
       (SELECT COUNT(*)
          FROM pg_trigger
         WHERE tgrelid=rel.oid
           AND tgisinternal = FALSE) AS triggercount
, rel.relpersistence
, substring(array_to_string(rel.reloptions, ',') FROM 'fillfactor=([0-9]*)') AS fillfactor
, substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_enabled=([a-z|0-9]*)') AS autovacuum_enabled
, substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_vacuum_threshold=([0-9]*)') AS autovacuum_vacuum_threshold
, substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_vacuum_scale_factor=([0-9]*[.][0-9]*)') AS autovacuum_vacuum_scale_factor
, substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_analyze_threshold=([0-9]*)') AS autovacuum_analyze_threshold
, substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_analyze_scale_factor=([0-9]*[.][0-9]*)') AS autovacuum_analyze_scale_factor
, substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_vacuum_cost_delay=([0-9]*)') AS autovacuum_vacuum_cost_delay
, substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_vacuum_cost_limit=([0-9]*)') AS autovacuum_vacuum_cost_limit
, substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_freeze_min_age=([0-9]*)') AS autovacuum_freeze_min_age
, substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_freeze_max_age=([0-9]*)') AS autovacuum_freeze_max_age
, substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_freeze_table_age=([0-9]*)') AS autovacuum_freeze_table_age
, substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_enabled=([a-z|0-9]*)') AS toast_autovacuum_enabled
, substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_vacuum_threshold=([0-9]*)') AS toast_autovacuum_vacuum_threshold
, substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_vacuum_scale_factor=([0-9]*[.][0-9]*)') AS toast_autovacuum_vacuum_scale_factor
, substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_analyze_threshold=([0-9]*)') AS toast_autovacuum_analyze_threshold
, substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_analyze_scale_factor=([0-9]*[.][0-9]*)') AS toast_autovacuum_analyze_scale_factor
, substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_vacuum_cost_delay=([0-9]*)') AS toast_autovacuum_vacuum_cost_delay
, substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_vacuum_cost_limit=([0-9]*)') AS toast_autovacuum_vacuum_cost_limit
, substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_freeze_min_age=([0-9]*)') AS toast_autovacuum_freeze_min_age
, substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_freeze_max_age=([0-9]*)') AS toast_autovacuum_freeze_max_age
, substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_freeze_table_age=([0-9]*)') AS toast_autovacuum_freeze_table_age
, rel.reloptions AS reloptions, tst.reloptions AS toast_reloptions
, (CASE WHEN rel.reltoastrelid = 0 THEN FALSE ELSE TRUE END) AS hastoasttable
, rel.reloftype, typ.typname
,
(SELECT array_agg(label) FROM pg_seclabels sl1 WHERE sl1.objoid=rel.oid AND sl1.objsubid=0) AS labels,
(SELECT array_agg(provider) FROM pg_seclabels sl2 WHERE sl2.objoid=rel.oid AND sl2.objsubid=0) AS providers  FROM pg_class rel
  LEFT OUTER JOIN pg_tablespace spc
    ON spc.oid=rel.reltablespace
  LEFT OUTER JOIN pg_description des
    ON (des.objoid=rel.oid
   AND des.objsubid=0
   AND des.classoid='pg_class'::regclass)
  LEFT OUTER JOIN pg_constraint con
    ON con.conrelid=rel.oid
   AND con.contype='p'
  LEFT OUTER JOIN pg_class tst
    ON tst.oid = rel.reltoastrelid
  LEFT JOIN pg_type typ
    ON rel.reloftype=typ.oid
 WHERE rel.relkind IN ('r','s','t')
   AND rel.relnamespace = 2200::oid
 ORDER BY rel.relname
