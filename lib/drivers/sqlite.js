/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia and Dove

	Please see LICENSE for more info
 */

'use strict';

let sqlite3 = require("sqlite3").verbose();
let lscrypto = require("./../lscrypto");
let config = require("./../../config");
let perms = require("./../perms");

let checkedExists = false;

function createDatabase(db, callback) {
	console.log("Creating database");
	db.serialize(function() {
		db.run("pragma journal_mode = WAL");

		db.run("create table meta ("
			+ "id integer primary key,"
			+ "key text,"
			+ "value text)");
		db.run("insert into meta(key, value) values ('version', '1')");

		db.run("create table device ("
			+ "id integer primary key,"
			+ "deviceid text,"
			+ "servicetype int,"
			+ "pushtoken text,"
			+ "userid int,"
			+ "foreign key(userid) references user(id))");

		db.run("create table user ("
			+ "id integer primary key,"
			+ "login text,"
			+ "pwhash text,"
			+ "name text,"
			+ "email text,"
			+ "enabled int,"
			+ "isadmin int)");
		db.run("insert into user(login, pwhash, name, isadmin) values (?, ?, 'Admin User', 1)",
			[ config.adminLogin, lscrypto.hash(config.adminPassword) ]);

		db.run("create table image ("
			+ "id integer primary key,"
			+ "fn text,"
			+ "userid int,"
			+ "uploadtime int,"
			+ "comment text,"
			+ "foreign key(userid) references user(id))");

		db.run("create table stream ("
			+ "id integer primary key,"
			+ "userid int,"
			+ "name text,"
			+ "permission int,"
			+ "foreign key(userid) references user(id))");
		db.run("insert into stream(userid, name, permission) values (1, 'Global Stream', " + perms.public + ")");

		db.run("create table streamimage ("
			+ "imageid int,"
			+ "streamid int,"
			+ "foreign key(imageid) references image(id),"
			+ "foreign key(streamid) references stream(id))");

		db.run("create table subscription ("
			+ "userid int,"
			+ "streamid int,"
			+ "foreign key(userid) references user(id),"
			+ "foreign key(streamid) references stream(id))");
		db.run("insert into subscription(userid, streamid) values (1, 1)");

		db.run("create table invitation ("
			+ "streamid int,"
			+ "userid int,"
			+ "foreign key(streamid) references stream(id),"
			+ "foreign key(userid) references user(id))", function() { callback(null); });
	});
}

function connect(callback) {
	let db = new sqlite3.Database("lifestream.db");

	if (!checkedExists) {
		checkedExists = true;
		db.get("select * from meta", function(err, row) {
			//if (err)
			//	return callback(err);

			if (!row)
				createDatabase(db, function() { callback(null, db); });
			else
				callback(null, db);
		});
	} else
		callback(null, db);
}

function select(db, statement, args, callback) {
	db.all(statement, args, callback);
}

function run(db, statement, args, callback) {
	db.run(statement, args, function(err) {
		if (err)
			return callback(err);
		else
			return callback(null, this.lastID);
	});
}

function close(db) {
	db.close();
}

module.exports = {
	connect: connect,
	select: select,
	run: run,
	close: close,
	getTransactStartSql: function() { return "begin immediate transaction"; }
};
