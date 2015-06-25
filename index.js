"use strict";

var pg           = require('pg'),
    fs           = require("fs"),
    url          = require("url"),
    colors       = require("colors"),
    structure    = null,
    tempDatabase = "temp_" + Number(new Date()).toString(32),
    hostname     = "localhost", // todo: get by options
    port         = "5432",      // todo: get by options
    login        = "postgres",  // todo: get by options
    password     = "postgres",  // todo: get by options
    database     = "place_1",   // todo: get by options
    connection   = url.format({
        protocol: "postgres",
        slashes:  true,
        hostname: hostname,
        port:     port,
        auth:     [login, password].join(":"),
        pathname: database
    });

const SQL_SELECT_ALL_DATABASES =
    "SELECT datname AS database    \n" +
    "  FROM pg_database            \n" +
    " WHERE datistemplate = false  \n" +
    "   AND datname = '{name}';\n";

const SQL_SELECT_ALL_TABLES =
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public';";

const SQL_SELECT_ALL_VIEWS =
    "SELECT viewname, definition FROM pg_views WHERE schemaname = 'public';";

const SQL_DROP_DATABASE =
    "DROP DATABASE IF EXISTS \"{name}\";";

const SQL_CREATE_DATABASE =
    "CREATE DATABASE \"{name}\";";

const SQL_DROP_TABLE =
    "DROP TABLE IF EXISTS \"{name}\";";

const SQL_CREATE_TABLE =
    "CREATE TABLE \"{name}\" () WITH (OIDS=FALSE);";

const SQL_DROP_VIEW =
    "DROP VIEW \"{name}\";";

const SQL_CREATE_VIEW =
    "CREATE OR REPLACE VIEW \"{name}\" AS {definition};";

function deferred(actions) {
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
 * @param {function} callback
 * @return {void}
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
                client.query(SQL_SELECT_ALL_TABLES, function (error, result) {
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
                client.query(SQL_SELECT_ALL_VIEWS, function (error, result) {
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

function showError(error) {
    console.log(error.message);
    // exit 1
}

pg.connect(connection, function(error, client, done) {
    var exists = false;
    if (!error) {
        deferred([
            function (next) {
                var query = SQL_SELECT_ALL_DATABASES.replace(/\{name\}/g, tempDatabase);
                client.query(query, function(error, result) {
                    if (!error) {
                        exists = result.rowCount !== 0;
                        next();
                    } else {
                        showError(error);
                        done();
                        client.end();
                    }
                });
            },
            function (next) {
                var query;
                if (exists) {
                    query = SQL_DROP_DATABASE.replace(/\{name\}/g, tempDatabase);
                    client.query(query, function (error) {
                        if (!error) {
                            next();
                        } else {
                            showError(error);
                            done();
                            client.end();
                        }
                    });
                } else {
                    next();
                }
            },
            function (next) {
                var query = SQL_CREATE_DATABASE.replace(/\{name\}/g, tempDatabase);
                client.query(query, function (error) {
                    if (!error) {
                        next();
                    } else {
                        showError(error);
                        done();
                        client.end();
                    }
                });
            },
            // load dump structure
            function (next) {
                loadDumpStructure({
                    hostname: "localhost",
                    port:     5432,
                    login:    "postgres",
                    password: "postgres",
                    database: tempDatabase,
                    files:    ["dump.sql"]
                }, function (error, result) {
                    if (!error) {
                        structure = result;
                        next();
                    } else {
                        showError(error);
                        done();
                        client.end();
                    }
                });
            },
            function (next) {
                client.query("BEGIN;", function(error, result) {
                    if (!error) {
                        next();
                    } else {
                        showError(error);
                        done();
                        client.end();
                    }
                });
            },
            // drop/create tables
            function (next) {
                var tables = Object.keys(structure.tables);
                var realTables = [];
                deferred([
                    function (next) {
                        client.query(SQL_SELECT_ALL_TABLES, function (error, result) {
                            if (!error) {
                                var index,
                                    length = result.rows.length,
                                    table;
                                for (index = 0; index < length; index += 1) {
                                    table = result.rows[index].tablename;
                                    if (realTables.indexOf(table) === -1) {
                                        realTables.push(table);
                                    }
                                }
                                next();
                            } else {
                                showError(error);
                            }
                        });
                    },
                    function (next) {
                        var index,
                            actions = [],
                            length = realTables.length;
                        function addDropAction(table) {
                            actions.push(function (next) {
                                client.query(SQL_DROP_TABLE.replace(/\{name\}/g, table), function (error) {
                                    if (error) {
                                        showError(error);
                                    } else {
                                        console.log("DROP TABLE ".gray + String("\"" + table + "\"").green + ";".gray);
                                        next();
                                    }
                                });
                            });
                        }
                        function addCreateAction(table) {
                            actions.push(function (next) {
                                client.query(SQL_CREATE_TABLE.replace(/\{name\}/g, table), function (error) {
                                    if (error) {
                                        showError(error);
                                    } else {
                                        console.log("CREATE TABLE ".gray + String("\"" + table + "\"").green + ";".gray);
                                        next();
                                    }
                                });
                            });
                        }
                        for (index = 0; index < length; index += 1) {
                            if (tables.indexOf(realTables[index]) === -1) {
                                addDropAction(realTables[index]);
                            }
                        }
                        length = tables.length;
                        for (index = 0; index < length; index += 1) {
                            if (realTables.indexOf(tables[index]) === -1) {
                                addCreateAction(tables[index]);
                            }
                        }
                        actions.push(function () {
                            next();
                        });
                        deferred(actions);
                    },
                    function () {
                        next();
                    }
                ]);
            },
            // drop/create views
            function (next) {
                var views = Object.keys(structure.views);
                var realViews = [];
                deferred([
                    function (next) {
                        client.query(SQL_SELECT_ALL_VIEWS, function (error, result) {
                            if (!error) {
                                var index,
                                    length = result.rows.length,
                                    view;
                                for (index = 0; index < length; index += 1) {
                                    view = result.rows[index].viewname;
                                    if (realViews.indexOf(view) === -1) {
                                        realViews.push(view);
                                    }
                                }
                                next();
                            } else {
                                showError(error);
                            }
                        });
                    },
                    function (next) {
                        var index,
                            actions = [],
                            length = realViews.length;
                        function addDropAction(view) {
                            actions.push(function (next) {
                                client.query(SQL_DROP_VIEW.replace(/\{name\}/g, view), function (error) {
                                    if (error) {
                                        showError(error);
                                    } else {
                                        console.log("DROP VIEW ".gray + String("\"" + view + "\"").green + ";".gray);
                                        next();
                                    }
                                });
                            });
                        }
                        function addCreateAction(view, definition) {
                            var query = SQL_CREATE_VIEW.
                                replace(/\{name\}/g, view).
                                replace(/\{definition\}/g, definition);
                            client.query(query, function (error) {
                                if (error) {
                                    showError(error);
                                } else {
                                    console.log("CREATE VIEW ".gray + String("\"" + view + "\"").green + ";".gray);
                                    next();
                                }
                            });
                        }
                        for (index = 0; index < length; index += 1) {
                            if (views.indexOf(realViews[index]) === -1) {
                                addDropAction(realViews[index]);
                            }
                        }
                        length = views.length;
                        for (index = 0; index < length; index += 1) {
                            if (realViews.indexOf(views[index]) === -1) {
                                addCreateAction(views[index], structure.views[views[index]]);
                            }
                        }
                        actions.push(function () {
                            next();
                        });
                        deferred(actions);
                    },
                    function () {
                        next();
                    }
                ]);
            },
            function (next) {
                client.query("COMMIT;", function(error, result) {
                    if (!error) {
                        next();
                    } else {
                        showError(error);
                        done();
                        client.end();
                    }
                });
            },
            function (next) {
                var query = SQL_DROP_DATABASE.replace(/\{name\}/g, tempDatabase);
                client.query(query, function (error) {
                    if (!error) {
                        next();
                    } else {
                        showError(error);
                        done();
                        client.end();
                    }
                });
            },
            function () {
                done();
                client.end();
            }
        ]);
    } else {
        showError(error);
        done();
        client.end();
    }
});

