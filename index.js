var pg = require('pg');
var database = "temp" + String(Number(new Date()));
var exists = false;
var spawn    = require("child_process").spawn;

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


pg.connect("postgres://postgres:postgres@localhost/place_1", function(error, client, done) {

    if (error) {
        return console.error('error fetching client from pool', err);
    }

    deferred([
        function (next) {
            client.query("SELECT datname AS database FROM pg_database WHERE datistemplate = false AND datname = '" + database + "';", function(err, result) {
                if (err) {
                    return console.error('error running query', err);
                }
                exists = result.rowCount !== 0;
                next();
            });
        },
        function (next) {
            if (exists) {
                client.query("DROP DATABASE IF EXISTS " + database + ";", function (error) {
                    if (error) {
                        return console.error('error running query', error);
                    }
                    next();
                });
            } else {
                next();
            }
        },
        function (next) {
            client.query("CREATE DATABASE " + database + ";", function (error) {
                if (error) {
                    return console.error('error running query', error);
                }
                next();
            });
        },
        function () {
            console.log("dumping");
            var process = spawn("node", ["./dump.js", "localhost", "5432", "postgres", "postgres", database, "dump.sql"]);
            process.stdout.on("data", function (data) {
                console.log(data.toString("utf8"));
            });
            process.stderr.on("data", function (data) {
                console.log(data.toString("utf8"));
            });
            process.on("close", function (code) {
                console.log("dump created");
            });
        }
    ]);

    /*client.query('SELECT $1::int AS number', ['1'], function(err, result) {

        done();

        if(err) {
            return console.error('error running query', err);
        }
        console.log(result.rows[0].number);
        //output: 1
    });*/

});

