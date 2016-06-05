/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Dove

	Please see LICENSE for more info
 */

'use strict';

let mysql = require("mysql");
let lscrypto = require("./../lscrypto");
let config = require("./../../config");
let models = require("./../models");
let perms = require("./../perms");

let pool = null;
let checkedExists = false;

// Creates a function that takes any thrown error value and wraps it in an
// error model before calling the callback.
function modelWrapper(message, errorWrapper) {
	return function(err, results) {
		if (err)
			errorWrapper(models.error(message, err));
		else
			errorWrapper(null, results);
	}
}

// Initialize the database if it's not already been initialized. Callback is
// a standard err function.
function dbInit(db, callback) {
	db.query("select * from meta", function(err, results) {
		if (err)
			return callback(models.error("Can't check for database initialisation", err));

		if (results && results.length) {
			// The database was already initialized.
			return callback();
		}

		// We need to initialize some values in the tables. This assumes the tables
		// were already created earlier.
		db.query("start transaction;"
				+ "insert into meta(token, value) values ('version', '1');"
				+ "insert into user(login, pwhash, name, isadmin) values (?, ?, 'Admin', 1);"
				+ "select @id := last_insert_id();"
				+ "insert into stream(userid, name, permission) values (@id, 'Global Stream', ?);"
				+ "insert into subscription(userid, streamid) values (@id, last_insert_id());"
				+ "commit;",
				[ config.adminLogin, lscrypto.hash(config.adminPassword), perms.public ],
				modelWrapper("Can't initialise database", callback));
	});
}

// Executes a database statement on a pooled connection. All commands executed
// on the connection are not guaranteed to run instantly, but are guaranteed to run
// sequentially and serially.
function connect(callback) {
	if (!pool) {
		pool = mysql.createPool({
			connectionLimit: 10,
			host: config.mysqlHost,
			user: config.mysqlUser,
			password: config.mysqlPassword,
			database: config.mysqlDatabase,
			multipleStatements: true
		});
	}

	pool.getConnection(function(err, connection) {
		if (err) {
			callback(err);
		} else {
			if (!checkedExists) {
				dbInit(connection, function(err) {
					if (err)
						return callback(err);
					else {
						checkedExists = true;
						return callback(null, connection);
					}
				});
			} else
				return callback(null, connection);
		}
	});
}

function select(db, statement, args, callback) {
	db.query(statement, args, callback);
}

function run(db, statement, args, callback) {
	db.query(statement, args, function(err, results) {
		if (err)
			return callback(err);
		else
			return callback(null, results.insertId);
	});
}

function close(db) {
	db.release();
}

module.exports = {
	connect: connect,
	select: select,
	run: run,
	close: close,
	getTransactStartSql: function() { return "start transaction"; }
};
