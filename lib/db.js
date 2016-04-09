/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var sqlite3 = require("sqlite3").verbose();

function dbGet() {
	var db = new sqlite3.Database("lifestream.db");
	var exists = false;

	db.serialize(function() {
		db.each("select * from meta", function() {
			exists = true;
		});
	});

	if (!exists) {
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

			db.run("create table if not exists stream ("
				+ "userid int,"
				+ "name text)");

			db.run("create table if not exists image ("
				+ "fn text,"
				+ "streamid int,"
				+ "comment text)");
		});
	} else {
		console.log("Database was already created");
	}

	return db;
}

// Callback should take an error argument.
function userCreate(login, passwordHash, name, callback) {
	var db = dbGet();

	console.log("Creating user",login);
	db.serialize(function() {
		db.get("select * from user where login=?", [ login ], function(err, row) {
			console.log(row);
			if (row) {
				console.log("setting userExists to true");
				callback("User already exists");
				db.close();
				return;
			}

			db.run("insert into user(login, pwhash, name) values (?,?,?)", [ login, passwordHash, name ], function() {
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
	var db = dbGet();

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
}

module.exports = {
	get: dbGet,
	userCreate: userCreate,
	userLogin: userLogin
};
