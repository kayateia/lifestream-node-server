/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var sqlite3 = require("sqlite3").verbose();
var lscrypto = require("./lscrypto");

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
					+ "name text,"
					+ "email text,"
				    + "isadmin int)");
				db.run("insert into user(login, pwhash, name) values ('admin', ?, 'Admin User')",
					[ lscrypto.hash("admin") ]);

				db.run("create table if not exists stream ("
					+ "userid int,"
					+ "name text)");
				db.run("insert into stream(userid, name) values (1, 'Global Stream')");

				db.run("create table if not exists image ("
					+ "fn text,"
					+ "userid int,"
					+ "streamid int,"
					+ "uploadtime int,"
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
				callback(err, null);
			} else {
				if (row) {
					callback(null, row.rowid);
				} else {
					callback("User or password is incorrect", null);
				}
			}
		});
	});
}

// Callback should take an error object and a row object.
function userGetById(id, callback) {
	dbExec(function(db) {
		db.get("select rowid,login,pwhash,name,email,isadmin from user where rowid=?", [ id ], function(err, row) {
			if (err)
				callback(err);
			else {
				callback(null, row);
			}
		});
	});
}

// Callback should accept an error object and a row object.
function userGetByLogin(login, callback) {
	dbExec(function(db) {
		db.get("select rowid,login,pwhash,name,email,isadmin from user where login=?", [ login ], function(err, row) {
			if (err)
				callback(err);
			else {
				callback(null, row);
			}
		});
	});
}

// Callback should take an error argument and an array of streams.
function streamList(userid, callback) {
	dbExec(function(db) {
		db.all("select rowid as streamid,userid,name from stream", function(err, rows) {
			db.close();
			if (err) {
				callback(err);
			} else {
				callback(null, rows);
			}
		});
	});
}

// Callback should take an error argument and an array of images.
function streamContents(streamid, maxnum, callback) {
	dbExec(function(db) {
		db.all("select image.rowid as id,image.fn as fn,user.login userLogin,image.uploadtime as uploadtime,"
			+ " image.comment as comment from image"
			+ " inner join user on image.userid=user.rowid"
			+ " where image.streamid=?"
			+ " order by image.uploadtime desc"
			+ " limit ?",
			[streamid, maxnum],
			function(err, rows) {
				db.close();
				callback(err, rows);
			});
	});
}

// Callback should take an error argument.
function imageAdd(userid, streamid, filename, comment, callback) {
	dbExec(function(db) {
		db.run("insert into image(userid, streamid, fn, comment, uploadtime) values (?,?,?,?,?)",
			[ userid, streamid, filename, comment, Math.trunc(Date.now() / 1000) ],
			function(err) {
				console.log("completed image add", err);
				db.close();
				callback(err)
			});
	});
}

// Callback should take a row and an error argument.
function imageGet(imageid, callback) {
	dbExec(function(db) {
		db.all("select userid, streamid, fn, comment, uploadtime from image where rowid=?",
			[ imageid ],
			function(err, rows) {
				if (err)
					callback(err, null);
				else
					callback(null, rows[0]);
			});
	});
}

module.exports = {
	exec: dbExec,
	userCreate: userCreate,
	userLogin: userLogin,
	userGetById: userGetById,
	userGetByLogin: userGetByLogin,
	streamList: streamList,
	streamContents: streamContents,
	imageAdd: imageAdd,
	imageGet: imageGet
};
