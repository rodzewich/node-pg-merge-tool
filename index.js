var pg       = require('pg'),
    exists   = false, // todo: remove
    fs       = require("fs"),
    url      = require("url"),
    database = "temp_" + Number(new Date()).toString(32);

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

/**
 * @public
 * @function
 * @name loadDumpStructure
 * @param {object} options
 * @param {string} [options.hostname]
 * @param {number} [options.port]
 * @param {string} [options.login]
 * @param {string} [options.password]
 * @param {string} options.database
 * @param {string[]} options.files
 * @param callback
 */
function loadDumpStructure(options, callback) {
    var hostname   = options.hostname || "localhost",
        port       = options.port || 5432,
        login      = options.login || "postgres",
        password   = options.password || "postgres",
        database   = options.database,
        files      = options.files,
        connection = url.format({
            protocol: "postgres",
            slashes:  true,
            hostname: hostname,
            port:     port,
            auth:     [login, password].join(":"),
            pathname: database
        });
    pg.connect(url.format(connection), function (error, client, done) {
        var query,
            views,
            tables;
        deferred([
            function (next) {
                var actions = [],
                    length = files.length,
                    index;
                function addActions(filename) {
                    actions.push(function (next) {
                        fs.readFile(filename, function (error, content) {
                            if (error) {
                                callback(error, null);
                            } else {
                                query = content.toString("utf8");
                                next();
                            }
                        });
                    });
                    actions.push(function (next) {
                        client.query(query, function (error) {
                            if (error) {
                                callback(error, null);
                            } else {
                                next();
                            }
                        });
                    });
                }
                for (index = 0; index < length; index += 1) {
                    addActions(files[index]);
                }
                actions.push(function () {
                    next();
                });
                deferred(actions);
            },
            function (next) {
                client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public';", function (error, result) {
                    if (error) {
                        callback(error, null);
                    } else {
                        tables = {};
                        result.rows.forEach(function (row) {
                            if (!tables[row.tablename]) {
                                tables[row.tablename] = "structure";
                            }
                        });
                        next();
                    }
                });
            },
            function (next) {
                client.query("SELECT viewname, definition FROM pg_views WHERE schemaname = 'public';", function (error, result) {
                    if (error) {
                        callback(error, null);
                    } else {
                        views = {};
                        result.rows.forEach(function (row) {
                            if (!views[row.viewname]) {
                                views[row.viewname] = row.definition;
                            }
                        });
                        next();
                    }
                });
            },
            function () {
                done();
                client.end();
                callback(null, {tables: tables, views: views});
            }
        ]);
    });
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
        function (next) {
            loadDumpStructure({
                hostname: "localhost",
                port:     5432,
                login:    "postgres",
                password: "postgres",
                database: database,
                files:    ["dump.sql"]
            }, function (error, structure) {
                if (error) {
                    return console.error('error running query', error);
                }
                next();
            });
        },
        function (next) {
            client.query("DROP DATABASE IF EXISTS " + database + ";", function (error) {
                if (error) {
                    return console.error('error running query', error);
                }
                next();
            });
        },
        function () {
            done();
            client.end();
        }
    ]);

});

