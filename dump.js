/*jslint */
/*global process */

var host     = process.argv[2],
    port     = process.argv[3],
    login    = process.argv[4],
    password = process.argv[5],
    database = process.argv[6],
    dump     = process.argv[7],
    fs       = require("fs"),
    pg       = require("pg");

function deferred(actions) {
    "use strict";
    function iterate() {
        setTimeout(function () {
            var action = actions.shift();
            if (typeof action === "function") {
                action(iterate);
            }
        }, 0);
    }
    iterate();
}

// todo: fix connection string
pg.connect("postgres://" + login + ":" + password + "@" + host + "/" + database, function(error, client, done) {
    var query, tables;
    deferred([
        function (next) {
            fs.readFile(dump, function (error, content) {
                if (error) {
                    console.log(JSON.stringify({
                        result: null,
                        error: error.message
                    }));
                } else {
                    query = content.toString("utf8");
                    next();
                }
            });
        },
        function (next) {
            client.query(query, function (error) {
                if (error) {
                    console.log(JSON.stringify({
                        result: null,
                        error: error.message
                    }));
                } else {
                    next();
                }
            });
        },
        function (next) {
            client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'", function (error, result) {
                    if (error) {
                        console.log(JSON.stringify({
                            result: null,
                            error: error.message
                        }));
                    } else {
                        tables = [];
                        result.rows.forEach(function (row) {
                            if (tables.indexOf(row.tablename) === -1) {
                                tables.push(row.tablename);
                            }
                        });
                        next();
                    }
            });
        },
        function () {
            console.log(JSON.stringify({
                result: tables,
                error: null
            }));
            done();
            client.end();
        }
    ]);
});

