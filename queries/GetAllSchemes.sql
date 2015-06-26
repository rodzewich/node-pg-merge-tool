-- get all schemes

SELECT n.nspname,
       d.description,
       (SELECT array_agg(s1.label)
          FROM pg_seclabels s1
         WHERE s1.objoid=n.oid) AS labels,
       (SELECT array_agg(s2.provider)
          FROM pg_seclabels s2
         WHERE s2.objoid=n.oid) AS providers
  FROM pg_namespace n
  LEFT OUTER JOIN pg_description d
    ON d.objoid=n.oid
   AND d.classoid='pg_namespace'::regclass
 WHERE n.nspname NOT LIKE E'pg\\_%'
   AND NOT (
           (n.nspname = 'pgagent' AND EXISTS (
               SELECT 1
                 FROM pg_class c1
                WHERE c1.relname = 'pga_job'
                  AND c1.relnamespace = n.oid
                LIMIT 1
           )) OR
           (n.nspname = 'information_schema' AND EXISTS (
               SELECT 1
                 FROM pg_class c2
                WHERE c2.relname = 'tables'
                  AND c2.relnamespace = n.oid
                LIMIT 1
           )) OR
           (n.nspname LIKE '_%' AND EXISTS (
               SELECT 1
                 FROM pg_proc p
                WHERE p.proname='slonyversion'
                  AND p.pronamespace = n.oid
                LIMIT 1
           ))
       )
 ORDER BY n.nspname;