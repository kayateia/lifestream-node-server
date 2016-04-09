/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var sqlite3 = require('sqlite3').verbose();

function dbGet() {
	var db = new sqlite3.Database('lifestream.db');

	db.serialize(function() {
		db.run("CREATE TABLE if not exists user_info (info TEXT)");
		db.run("create table if not exists meta ("
			+ "key text,"
			+ "value text)");

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

	return db;
}

// function

/*db.serialize(function() {
	db.run("CREATE TABLE if not exists user_info (info TEXT)");
	var stmt = db.prepare("INSERT INTO user_info VALUES (?)");
	for (var i = 0; i < 10; i++) {
		stmt.run("Ipsum " + i);
	}
	stmt.finalize();

	db.each("SELECT rowid AS id, info FROM user_info", function(err, row) {
		console.log(row.id + ": " + row.info);
	});

	db.close();
});*/

module.exports = {
	get: dbGet
};
