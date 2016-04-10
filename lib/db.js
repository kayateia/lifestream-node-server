/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var sqlite3 = require("sqlite3").verbose();
var lscrypto = require("./crypto");

// innards should take a sqlite3 object.
function dbExec(innards) {
	var db = new sqlite3.Database("lifestream.db");
	var exists = false;

	db.get("select * from meta", function(err, row) {
		if (!row) {
			console.log("Creating database");
			db.serialize(function() {
				db.run("create table if not exists meta ("
					+ "key text,"
					+ "value text)");
				db.run("insert into meta(key, value) values ('version', '1')");

				db.run("create table if not exists device ("
					+ "gcmid text,"
					+ "userid int,"
					+ "auth text)");

				db.run("create table if not exists user ("
					+ "login text,"
					+ "pwhash text,"
					+ "name text)");
				db.run("insert into user(login, pwhash, name) values ('admin', ?, 'Admin User')",
					[ lscrypto.hash("admin") ]);

				db.run("create table if not exists stream ("
					+ "userid int,"
					+ "name text)");
				db.run("insert into stream(userid, name) values (1, 'Global Stream')");

				db.run("create table if not exists image ("
					+ "fn text,"
					+ "streamid int,"
					+ "comment text)", function() { innards(db); });
			});
		} else {
			console.log("Database was already created");
			innards(db);
		}
	});
}

// Callback should take an error argument.
function userCreate(login, passwordHash, name, callback) {
	dbExec(function(db) {
		console.log("Creating user",login);
		db.get("select * from user where login=?", [ login ], function(err, row) {
			console.log(row);
			if (row) {
				db.close();
				return callback("User already exists");
			}

			db.serialize(function() {
				db.run("insert into user(login, pwhash, name) values (?,?,?)", [ login, passwordHash, name ]);
				db.each("select rowid as id, login, name, pwhash from user", function(err, row) {
					console.log(row.id, row.login, row.name, row.pwhash);
				});
				db.close();
				callback();
			});
		});
	});
}

// Callback should take an id and an error argument.
function userLogin(login, passwordHash, callback) {
	dbExec(function(db) {
		db.get("select rowid from user where login=? and pwhash=?", [ login, passwordHash ], function(err, row) {
			db.close();
			if (err) {
				callback(null, err);
			} else {
				if (row) {
					callback(row.rowid);
				} else {
					callback(null, "User or password is incorrect");
				}
			}
		});
	});
}

// Callback should take an array of streams and an error argument.
function streamList(userid, callback) {
	dbExec(function(db) {
		db.all("select rowid as streamid,userid,name from stream", function(err, rows) {
			db.close();
			if (err) {
				callback(null, err);
			} else {
				callback(rows);
			}
		});
	});
}

module.exports = {
	exec: dbExec,
	userCreate: userCreate,
	userLogin: userLogin,
	streamList: streamList
};
