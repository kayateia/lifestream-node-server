/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var sqlite3 = require("sqlite3").verbose();
var lscrypto = require("./lscrypto");
var models = require("./models");
var config = require("./../config");

// innards should take a sqlite3 object.
function dbExec(innards) {
	var db = new sqlite3.Database("lifestream.db");
	var exists = false;

	db.get("select * from meta", function(err, row) {
		if (!row) {
			console.log("Creating database");
			db.serialize(function() {
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
				db.run("insert into stream(userid, name, permission) values (1, 'Global Stream', 1)");

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
					+ "foreign key(userid) references user(id))", function() { innards(db); });
			});
		} else {
			console.log("Database was already created");
			innards(db);
		}
	});
}

// Callback should take an error argument. In case of error, a models.error() will be passed.
function userCreate(login, passwordHash, name, email, isadmin, callback) {
	dbExec(function(db) {
		console.log("Creating user",login);
		db.get("select * from user where login=?", [ login ], function(err, row) {
			console.log(row);
			if (row) {
				db.close();
				return callback(models.error("User already exists"));
			}

			db.serialize(function() {
				db.run("insert into user(login, pwhash, name, email, isadmin) values (?,?,?,?,?)", [ login, passwordHash, name, email, isadmin ]);
				db.close();
				callback();
			});
		});
	});
}

// Callback should take an error argument. In case of error, a models.error() will be passed.
function userUpdate(login, passwordHash, name, email, isadmin, callback) {
	dbExec(function(db) {
		console.log("Modifying user",login);
		db.get("select * from user where login=?", [ login ], function(err, row) {
			console.log(row);
			if (!row) {
				db.close();
				return callback(models.error("User doesn't exist"));
			}

			db.serialize(function() {
				if (passwordHash) {
					db.run("update user "
						+ "set pwhash=?,"
						+ "    name=?,"
						+ "    email=?,"
						+ "    isadmin=? "
						+ "where login=?",
						[ passwordHash, name, email, isadmin, login ]
					);
				}
				else {
					db.run("update user "
						+ "set name=?,"
						+ "    email=?,"
						+ "    isadmin=? "
						+ "where login=?",
						[ name, email, isadmin, login ]
					);
				}
				db.each("select id, login, name, pwhash from user", function(err, row) {
					console.log(row.id, row.login, row.name, row.pwhash);
				});
				db.close();
				callback();
			});
		});
	});
}

// Callback should take an error argument. In case of error, a models.error() will be passed.
function userDelete(login, callback) {
	dbExec(function(db) {
		console.log("Deleting user",login);
		db.get("select * from user where login=?", [ login ], function(err, row) {
			console.log(row);
			if (!row) {
				db.close();
				return callback(models.error("User doesn't exist"));
			}

			db.serialize(function() {
				db.run("delete from user where login=?", [ login ]);
				db.close();
				callback();
			});
		});
	});
}

// Callback should take an id and an error argument. In case of error, a models.error() will be passed.
function userLogin(login, passwordHash, callback) {
	dbExec(function(db) {
		db.get("select id, isadmin from user where login=? and pwhash=?", [ login, passwordHash ], function(err, row) {
			db.close();
			if (err) {
				callback(models.error("Error looking up user", err), null);
			} else {
				if (row) {
					callback(null, row.id, row.isadmin);
				} else {
					callback(models.error("User or password is incorrect"), null);
				}
			}
		});
	});
}

// Callback should take an error object and a row object. In case of error, a models.error() will be passed.
// If no user matching the description is found, that is considered an error.
function userGetById(id, callback) {
	dbExec(function(db) {
		db.get("select id,login,pwhash,name,email,enabled,isadmin from user where id=?", [ id ], function(err, row) {
			db.close();
			if (err) {
				callback(models.error("Error looking up user", err));
			}
			else if (row == undefined) {
				callback(models.error("User ID " + id + " not found."));
			}
			else {
				callback(null, row);
			}
		});
	});
}

// Callback should accept an error object and a row object. In case of error, a models.error() will be passed.
// If no user matching the description is found, that is considered an error.
function userGetByLogin(login, callback) {
	dbExec(function(db) {
		db.get("select id,login,pwhash,name,email,enabled,isadmin from user where login=?", [ login ], function(err, row) {
			db.close();
			if (err) {
				callback(models.error("Error looking up user", err));
			}
			else if (row == undefined) {
				callback("User " + login + " not found.");
			}
			else {
				callback(null, row);
			}
		});
	});
}

// Callback should take an error argument and an array of streams. In case of error, a models.error() will be passed.
function streamList(userid, callback) {
	dbExec(function(db) {
		db.all("select id as streamid,userid,name,permission from stream", function(err, rows) {
			db.close();
			if (err) {
				callback(models.error("Error listing streams", err));
			} else {
				callback(null, rows);
			}
		});
	});
}

// Callback should take an error argument and an array of images. In case of error, a models.error() will be passed.
function streamContents(streamid, maxnum, callback) {
	dbExec(function(db) {
		db.all("select image.id as id,image.fn as fn,user.login as userLogin,image.uploadtime as uploadtime,"
			+ " image.comment as comment from image"
			+ " inner join user on image.userid=user.id"
			+ " inner join streamimage on image.id=streamimage.imageid"
			+ " where streamimage.streamid=?"
			+ " order by image.uploadtime desc"
			+ " limit ?",
			[streamid, maxnum],
			function(err, rows) {
				db.close();
				if (err) {
					return callback(models.error("Error listing stream contents", err));
				}

				callback(null, rows);
			});
	});
}

// Callback should take an error argument. In case of error, a models.error() will be passed.
function imageAdd(userid, streamids, filename, comment, callback) {
	dbExec(function(db) {
		db.run("insert into image(userid, fn, comment, uploadtime) values (?,?,?,?)",
			[ userid, filename, comment, Math.trunc(Date.now() / 1000) ],
			function(err) {
				var rowId = this.lastID;
				console.log("inserted image", rowId);
				if (!err) {
					// Ideally, we would like to do all this inside a transaction. In practice,
					// the sheer ridiculosity of async programming means we can't. So we are just
					// going to blast these inserts and hope for the best.
					var addedCount = 0;
					for (var i=0; i<streamids.length; ++i) {
						db.run("insert into streamimage(streamid, imageid) values (?,?)",
							[ streamids[i], rowId ],
							function(err) {
								addedCount++;
								if (err)
									console.log("WARNING: Insert into streamimage failed:", err);
								if (addedCount == streamids.length) {
									db.close();
									if (err)
										callback(models.error("Error adding image to streams", err));
									else
										callback();
								}
							});
					}
				} else {
					db.close();
					callback(models.error("Error adding image to database", err));
				}
			});
	});
}

// Callback should take a row and an error argument. In case of error, a models.error() will be passed.
function imageGet(imageid, callback) {
	dbExec(function(db) {
		db.all("select userid, fn, comment, uploadtime from image where id=?",
			[ imageid ],
			function(err, rows) {
				db.close();
				if (err)
					callback(models.error("Error finding image in database", err), null);
				else
					callback(null, rows[0]);
			});
	});
}

var pushServiceTypes = {
	google: 0,
	apple: 1,
	microsoft: 2
};

// Registers a device for push notifications. In case of error, a models.error() will be passed.
function deviceRegister(userId, deviceId, serviceType, token, callback) {
	dbExec(function(db) {
		db.all("select id from device where deviceid=? and servicetype=? and userid=?",
			[ deviceId, serviceType, userId ],
			function(err, rows) {
				if (err) {
					db.close();
					callback(models.error("Error checking for existing device token", err), null);
				}

				if (rows.length > 0) {
					// We need to update here, not insert.
					db.run("update device set pushtoken=? where id=?",
						[ token, rows[0].id ],
						function(err) {
							db.close();
							if (err)
								callback(models.error("Error updating device token", err), null);
							else
								callback();
						});
				} else {
					// We need to insert a new entry.
					db.run("insert into device (deviceid, servicetype, pushtoken, userid) values (?,?,?,?)",
						[ deviceId, serviceType, token, userId ],
						function(err) {
							db.close();
							if (err)
								callback(models.error("Error adding new device token", err), null);
							else
								callback();
						});
				}
			});
	});
}

// Unregisters a previously registered device. Token should be sufficient
// to identify the device. In case of error, a models.error() will be passed.
function deviceUnregister(token, callback) {
	dbExec(function(db) {
		db.run("delete from device where pushtoken=?",
			[ token ],
			function(err) {
				db.close();
				callback(models.error("Error unregistering device", err));
			});
	});
}

// Streams should be an array of integer stream IDs. In case of error, a models.error() will be passed.
function deviceGetForStreams(streams, callback) {
	console.log("deviceGetForStreams");
	dbExec(function(db) {
		// This is really bad, but it basically is the only way to do this since you can't bind arrays
		// to SQL parameters. We explicitly check each item in the array for numbers to try to avoid
		// any injections.
		for (var i=0; i<streams.length; ++i) {
			if (!streams[i].toString().match(/[0-9]+/)) {
				db.close();
				return callback(models.error("Stream values are not all numbers"));
			}
		}
		var streamsStr = streams.join();
		db.all("select userid from subscription where streamid in (" + streamsStr + ")",
			function(err, rows) {
				console.log("foo",err, rows);
				if (err) {
					db.close();
					return callback(models.error("Error finding users subscribed to stream", err));
				}

				var ids = [];
				for (var i=0; i<rows.length; ++i)
					ids.push(rows[i].userid);
				var idsStr = ids.join();
				db.all("select deviceid,servicetype,pushtoken,userid from device where userid in (" + idsStr + ")",
					function(err, rows) {
						db.close();
						return callback(models.error("Error finding devices for user", err), rows);
					});
			});
	});
}

module.exports = {
	exec: dbExec,
	userCreate: userCreate,
	userUpdate: userUpdate,
	userDelete: userDelete,
	userLogin: userLogin,
	userGetById: userGetById,
	userGetByLogin: userGetByLogin,
	streamList: streamList,
	streamContents: streamContents,
	imageAdd: imageAdd,
	imageGet: imageGet,
	pushServiceTypes: pushServiceTypes,
	deviceRegister: deviceRegister,
	deviceUnregister: deviceUnregister,
	deviceGetForStreams: deviceGetForStreams
};
