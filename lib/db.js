/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia, Deciare, and Dove

	Please see LICENSE for more info
 */
'use strict';

let sal = require("./sal");
let lscrypto = require("./lscrypto");
let models = require("./models");
let config = require("./../config");
let dbconst = require("./dbconst");
let watt = require("watt");

//--------------------------------------------------------------------------------------------
// Higher-order SQL functions

// Do a plain SQL select, calling the callback with the returned rows, or a models-wrapped errorMessage.
var plainSelect = watt(function *(statement, args, errorMessage, callback) {
	var db, rows;

	var conclude = function() {
		sal.close(db);
		return callback(...arguments);
	};

	try {
		db = yield sal.connect();
		rows = yield sal.select(db, statement, args);
		return conclude(null, rows);
	}
	catch (err) {
		return conclude(models.error(errorMessage, err));
	}
}, { noCallback: true });

// Do a plain SQL run, calling the callback with the last insert ID (if applicable), or a models-wrapped errorMessage.
var plainRun = watt(function *(statement, args, errorMessage, callback) {
	var db, lastId;

	var conclude = function() {
		sal.close(db);
		return callback(...arguments);
	};

	try {
		db = yield sal.connect()
		lastId = yield sal.run(db, statement, args);
		return conclude(null, lastId);
	}
	catch (err) {
		return conclude(models.error(errorMessage, err));
	}
	sal.close(db);
}, { noCallback: true });

// Do a SQL select, calling the check function afterward; if the check function returns something truthy, it
// will be assumed to be an error message to be wrapped and thrown to the callback; otherwise, the runStatement
// is executed and the callback is called for success.
var checkThenRun = watt(function *(checkStatement, checkArgs, checkFunction, runStatement, runArgs, errorMessage, callback) {
	var db, rows, error, lastId;

	var conclude = function() {
		sal.close(db);
		return callback(...arguments);
	};

	try {
		db = yield sal.connect();
		rows = yield sal.select(db, checkStatement, checkArgs);
		error = checkFunction(rows);
		if (error)
			return conclude(models.error(error));

		lastId = yield sal.run(db, runStatement, runArgs);
		return conclude(null, lastId);
	}
	catch (err) {
		return conclude(models.error(errorMessage, err));
	}
}, { noCallback: true });

//--------------------------------------------------------------------------------------------

// Callback should take an error argument. In case of error, a models.error() will be passed.
function userCreate(login, passwordHash, name, email, isAdmin, callback) {
	console.log("Creating user", login);
	checkThenRun("select * from user where login=? or name=?", [ login, name ],
		function(rows) {
			if (rows.length)
				return "User login and name must be unique";
		},
		"insert into user(login, pwhash, name, email, isadmin) values (?,?,?,?,?)",
		[ login, passwordHash, name, email, isAdmin ],
		"Database error creating user",
		callback);
}

// Callback should take an error argument. In case of error, a models.error() will be passed.
var userUpdate = watt(function *(userid, passwordHash, name, email, isAdmin, callback) {
	console.log("Modifying user ", userid);
	var db, rows;

	var conclude = function() {
		sal.close(db);
		return callback(...arguments);
	};

	try {
		db = yield sal.connect();

		// Ensure that user exists
		rows = yield sal.select(db,
			"select * from user where id=?",
			[ userid ]);
		if (!rows.length) {
			return conclude(models.error("User doesn't exist"));
		}

		// Display name must be unique
		rows = yield sal.select(db,
			"select * from user where name=? and id<>?",
			[ name, userid ]);
		if (rows.length > 0) {
			return conclude(models.error("Display name must be unique"));
		}

		// Update user record
		let args = [ name, email, isAdmin ];
		if (passwordHash)
			args.push(passwordHash);
		args.push(userid);
		sal.run(db,
			"update user "
			+ "set name=?,"
			+ "    email=?,"
			+ "    isadmin=? "
			+ ( passwordHash ? "    ,pwhash=? " : "" )
			+ "where id=?",
		args)
		return conclude(null, rows);
	}
	catch (err) {
		return conclude(models.error("Database error updating user record", err));
	}
}, { noCallback: true });


// Callback should take an error argument. In case of error, a models.error() will be passed.
var userDelete = watt(function *(userid, callback) {
	var db, rows;

	var conclude = function() {
		sal.close(db);
		return callback(...arguments);
	};

	try {
		db = yield sal.connect();
		console.log("Deleting user " + userid);
		rows = yield  sal.select(db,
			"select * from user where id=?",
			[ userid ]);

		if (!rows.length) {
			return conclude(models.error("User ID " + userid + " doesn't exist"));
		}

		// Lots to do here, so we use a transaction
		yield sal.transact(db,
			// Unsubscribe/uninvite user from all streams
			"delete from subscription where userid=?;"
			// Unsubscribe/uninvite all users from this user's streams
			+ "delete from subscription where streamid in("
				+ "   select id from stream"
				+ "   where userid=?"
				+ " );"
			// Disassociate images from streams owned by user
			+ "delete from streamimage where streamid in("
					+ "   select id from stream"
					+ "   where userid=?"
					+ " );"
			//  Delete streams owned by user
			+ "delete from stream where userid=?;"
			// Delete images uploaded by user
			+ "delete from image where userid=?;"
			// Delete user
			+ "delete from user where id=?;",
			[ userid, userid, userid, userid, userid, userid, userid, userid ]);

		return conclude();
	}
	catch (err) {
		return conclude(models.error("Database error deleting user", err));
	}
}, { noCallback: true });

// Callback should take an error argument, id, and isAdmin flag. In case of error, a models.error() will be passed.
function userLogin(login, passwordHash, callback) {
	plainSelect("select id, isadmin as isAdmin from user where login=? and pwhash=?", [ login, passwordHash ],
		"Database error looking up user",
		function(err, rows) {
			if (err) {
				callback(err);
			}
			else if (rows.length) {
				callback(null, rows[0].id, rows[0].isAdmin);
			}
			else {
				callback(models.error("Login or password is incorrect"));
			}
		}
	);
}

// Callback should take an error object and a row object. In case of error, a models.error() will be passed.
// If no user matching the description is found, that is considered an error.
function userGetById(id, callback) {
	plainSelect("select id,login,pwhash,name,email,enabled,isadmin as isAdmin from user where id=?", [ id ],
		"Database error looking up user",
		function(err, rows) {
			if (err) {
				callback(err);
			}
			else if (!rows.length) {
				callback(models.error("User ID " + id + " not found."));
			}
			else {
				callback(null, rows[0]);
			}
		}
	);
}

// Callback should accept an error object and a row object. In case of error, a models.error() will be passed.
// If no user matching the description is found, that is considered an error.
function userGetByLogin(login, callback) {
	plainSelect("select id,login,pwhash,name,email,enabled,isadmin as isAdmin from user where login=?", [ login ],
		"Database error looking up user",
		function(err, rows) {
			if (err) {
				callback(err)
			}
			else if (!rows.length) {
				callback(models.error("User " + login + " not found."));
			}
			else {
				callback(null, rows[0]);
			}
		}
	);
}

// terms is an array. One search term per element.
// Callback should accept an error object, and a result object.
function userSearch(terms, callback) {
	let conditions = "";
	let subterms = [];

	for (let i = 0; i < terms.length; i++) {
		conditions = conditions + (i == 0 ? " " : " or") + " user.login like ? or user.name like ?";
		subterms.push("%" + terms[i] + "%");
		subterms.push("%" + terms[i] + "%");
	}

	plainSelect("select id, login, name"
			+ " from user"
			+ " where"
			+ conditions,
			subterms,
			"Database error searching users",
			callback);
}

// Callback should take an error argument and an array of streams. In case of error, a models.error() will be passed.
function streamList(userid, includeHidden, callback) {
	plainSelect("select stream.id as id, stream.userid as userid, stream.name as name, stream.permission as permission, user.login as userLogin, user.name as userName"
			+ " from stream"
			+ " inner join user on stream.userid=user.id"
			+ " where 1=1"
			+ (!includeHidden ? " and permission != " + dbconst.perms.hidden : "")
			+ (userid > 0 ? " and userid=" + userid : "")
			+ " order by stream.id",
			[],
			"Database error listing streams",
			callback);
}

// streamid may be a number or a comma-delimited list of numbers.
// Callback should take an error argument and an array of images. In case of error, a models.error() will be passed.
function streamContents(streamid, maxNum, olderThan, olderThanId, callback) {
	let queryString = "select image.id as id, image.fn as fn, user.id as userid, user.login as userLogin, user.name as userName, image.uploadtime as uploadtime, image.comment as comment, count(streamimage.streamid) as streamcount"
		+ " from image"
		+ " inner join user on image.userid=user.id"
		+ " inner join streamimage on image.id=streamimage.imageid"
		+ " where streamimage.streamid in(" + streamid + ")"
		+ (olderThan ? " and image.uploadtime < ?" : "")
		+ (olderThanId ? " and image.id < ?" : "")
		+ " group by image.id"
		+ " order by image.uploadtime desc, image.id desc"
		+ " limit ?";
	let args = [];
	if (olderThan)
		args.push(olderThan);
	if (olderThanId)
		args.push(olderThanId);
	args.push(maxNum);

	plainSelect(queryString, args, "Database error listing stream contents", callback);
}

// Callback should take an error argument and a row argument. In case of error, a models.error() will be passed.
function streamInfo(streamid, callback) {
	plainSelect("select stream.id as id, stream.userid as userid, stream.name as name, stream.permission as permission, user.login as userLogin, user.name as userName"
		+ " from stream"
		+ " inner join user on stream.userid=user.id"
		+ " where stream.id=?",
		[ streamid ],
		"Database error getting stream info",
		function(err, rows) {
			if (err) {
				callback(err);
			}
			else if (!rows) {
				callback(models.error("Stream not found"));
			}
			else {
				callback(null, rows[0]);
			}
		});
}

// Callback should take an error argument. In case of error, a models.error() will be passed.
function streamCreate(userid, name, permission, callback) {
	plainRun("insert into stream(userid, name, permission)"
			+ " values(?, ?, ?)",
			[ userid, name, permission ],
			"Database error creating stream",
			callback);
}

// Callback should take an error argument. In case of error, a models.error() will be passed.
function streamModify(streamid, name, permission, callback) {
	if (name && !permission) {
		plainRun("update stream set name=? where id=?",
			[ name, streamid ],
			"Database error modifying stream",
			callback
		);
	}
	else if (!name && permission) {
		plainRun("update stream set permission=? where id=?",
			[ permission, streamid ],
			"Database error modifying stream",
			callback
		);
	}
	else if (name && permission) {
		plainRun("update stream set name=?, permission=? where id=?",
			[ name, permission, streamid ],
			"Database error modifying stream",
			callback
		);
	}
	else {
		return callback(models.error("No changes requested"));
	}
}

// Callback should take an error argument. In case of error, a models.error() will be passed.
var streamDelete = watt(function *(streamid, callback) {
	var db;

	var conclude = function() {
		sal.close(db);
		return callback(...arguments);
	};

	try {
		db = yield sal.connect();

		// Much to do, so do it in a transaction.
		yield sal.transact(db,
			// Unsubscribe/uninvite all users from stream.
			"delete from subscription where streamid=?;"
			// Disassociate all images from this stream.
			+ "delete from streamimage where streamid=?;"
			// Delete the stream.
			+ "delete from stream where id=?",
			[ streamid, streamid, streamid, streamid ]);

		return conclude();
	}
	catch (err) {
		return conclude(models.error("Database error deleting stream", err));
	}
}, { noCallback: true });

// terms is an array. One search term per element.
// Callback should accept an error object, and a result object.
function streamSearch(terms, callback) {
	let conditions = "";
	let subterms = [];

	for (let i = 0; i < terms.length; i++) {
		conditions = conditions + (i == 0 ? " " : " or") + " stream.name like ?";
		subterms.push("%" + terms[i] + "%");
	}

	plainSelect("select stream.id as id, user.id as userid, user.login as userLogin, user.name as userName, stream.name as name, stream.permission as permission"
		+ " from stream"
		+ " inner join user on stream.userid=user.id"
		+ " where stream.permission in(" + dbconst.perms.public + "," + dbconst.perms.approval + ") and ("
		+ conditions
		+ ")",
		subterms,
		"Database error searching streams",
		callback);
}

// Callback should take an error argument. In case of error, a models.error() will be passed.
var imageAdd = watt(function *(userid, streamids, filename, comment, callback) {
	var db, imageId;

	var conclude = function() {
		sal.close(db);
		return callback(...arguments);
	};

	try {
		db = yield sal.connect();

		try {
			yield sal.run(db, sal.getTransactStartSql(), []);
			imageId = yield sal.run(db,
				"insert into image(userid, fn, comment, uploadtime) values (?,?,?,?)",
				[ userid, filename, comment, Math.trunc(Date.now() / 1000) ]);

			for (let i=0; i<streamids.length; ++i) {
				yield sal.run(db,
					"insert into streamimage(streamid, imageid) values (?,?)",
					[ streamids[i], imageId ]);
			}

			// All sucessful
			yield sal.run(db, "commit");
			return conclude(null, imageId);
		}
		catch (err) {
			try {
				yield sal.run(db, "rollback")
			}
			catch (err) {
				// Rollback failed
				return conclude(models.error("Error rolling back image add", err));
			}
			// Any part of the transaction failed
			return conclude(models.error("Error adding image to database", err));
		}
	}
	catch (err) {
		// Acquiring connection failed
		return conclude(models.error("Error adding image to database", err));
	}
}, { noCallback: true });

// Callback should take a row and an error argument. In case of error, a models.error() will be passed.
function imageGet(imageid, callback) {
	plainSelect("select userid, fn, comment, uploadtime from image where id=?",
		[ imageid ],
		"Error finding image in database",
		function(err, rows) {
			if (err)
				return callback(err);
			else
				return callback(null, rows[0]);
		}
	);
}

// Callback should accept an error
function imageComment(imageid, comment, callback) {
	plainRun("update image "
		+ "set comment=? "
		+ "where id=?",
		[ comment, imageid ],
		"Database error updating comment",
		callback);
}

// Callback should accept an error and array of stream objects
function imageGetStreams(imageid, callback) {
	// Obtain information about each stream that contains the image
	plainSelect("select stream.id as id, stream.name as name, stream.permission as permission, stream.userid as userid, user.login as userLogin, user.name as userName"
			+ " from streamimage"
			+ " inner join stream on streamimage.streamid=stream.id"
			+ " inner join user on stream.userid=user.id"
			+ " where streamimage.imageid=?"
			+ " order by stream.name, user.login",
		[ imageid ],
		"Database error getting list of streams containing image",
		callback);
}

// Callback should accept an error
function imageAddStream(imageid, streamid, callback) {
	checkThenRun("select imageid, streamid"
				+ " from streamimage"
				+ " where imageid=? and streamid=?",
		[ imageid, streamid ],
		function(rows) {
			if (rows.length)
				return "Image is already associated with stream";
		},
		"insert into streamimage(imageid, streamid)"
			+ " values(?, ?)",
			[ imageid, streamid ],
		"Database error checking stream-image association",
		callback);
}

// Callback should accept an error
function imageRemoveStream(imageid, streamid, callback) {
	plainRun("delete from streamimage where imageid=? and streamid=?",
		[ imageid, streamid ],
		"Database error dissociating image from stream",
		callback);
}

// Calls callback with no error if user can view image.
// Calls callback with error otherwise.
var imageCheckViewPermission = watt(function *(imageid, userid, callback) {
	var db, rows;

	var conclude = function() {
		sal.close(db);
		return callback(...arguments);
	};

	try {
		db = yield sal.connect();
		rows = yield sal.select(db,
			"select image.id"
			+ " from image"
			+ " where image.id=? and image.userid=?",
			[ imageid, userid ]);

		if (rows.length) {
			// Uploader can view own images
			return conclude();
		}

		rows = yield sal.select(db,
			"select streamimage.streamid"
			+ " from streamimage"
			+ " inner join stream on streamimage.streamid=stream.id"
			+ " where streamimage.imageid=?"
			+ " and stream.permission=?"
			+ " limit 1",
			[ imageid, dbconst.perms.public ]);

		if (rows.length) {
			// Anyone can view images belonging to at least one public stream
			return conclude();
		}

		rows = yield sal.select(db,
			"select subscription.streamid"
			+ " from subscription"
			+ " inner join streamimage on subscription.streamid=streamimage.streamid"
			+ " where streamimage.imageid=?"
			+ " and subscription.userid=?"
			+ " and subscription.state=?"
			+ " limit 1",
			[ imageid, userid, dbconst.sub.active ]);

		if (rows.length) {
			// Subscribers can view images belonging to at least one stream to
			// which they are suscribed
			return conclude();
		}
		else {
			return conclude(models.error("Permission denied"));
		}
	}
	catch (err) {
		return conclude(models.error("Database error checking permission to view image", err));
	}
}, { noCallback: true });

// Calls callback with no error if user can edit image.
// Calls callback with error otherwise.
function imageCheckEditPermission(imageid, userid, callback) {
	// Only the uploader of an image can make changes to it
	plainSelect("select image.id"
			+ " from image"
			+ " where image.id=? and image.userid=?",
		[ imageid, userid ],
		"Database error checking for permission to edit image",
		function(err, rows) {
			if (err)
				return callback(err);
			else if (rows.length)
				return callback();
			else
				return callback(models.error("Permission denied"));
		});
}

let pushServiceTypes = {
	google: 0,
	apple: 1,
	microsoft: 2
};

// Registers a device for push notifications. In case of error, a models.error() will be passed.
var deviceRegister = watt(function *(userId, deviceId, serviceType, token, callback) {
	var db, rows;

	var conclude = function() {
		sal.close(db);
		return callback(...arguments);
	};

	try {
		db = yield sal.connect();
		rows = yield sal.select(db,
			"select id from device where deviceid=? and servicetype=? and userid=?",
			[ deviceId, serviceType, userId ]);

		if (rows.length > 0) {
			// We need to update here, not insert.
			yield sal.run(db, "update device set pushtoken=? where id=?",
				[ token, rows[0].id ]);
		} else {
			// We need to insert a new entry.
			yield sal.run(db, "insert into device (deviceid, servicetype, pushtoken, userid) values (?,?,?,?)",
				[ deviceId, serviceType, token, userId ]);
		}

		return conclude();
	}
	catch (err) {
		return conclude(models.error("Error registering device", err));
	}
}, { noCallback: true });

// Unregisters a previously registered device. Token should be sufficient
// to identify the device. In case of error, a models.error() will be passed.
function deviceUnregister(token, callback) {
	plainRun("delete from device where pushtoken=?",
		[ token ],
		"Error unregistering device",
		callback);
}

// Streams should be an array of integer stream IDs. In case of error, a models.error() will be passed.
var deviceGetForStreams = watt(function *(streams, callback) {
	var db, streamsStr, rows, idsStr;
	var ids = [];

	var conclude = function() {
		sal.close(db);
		return callback(...arguments);
	};

	console.log("deviceGetForStreams");

	// This is really bad, but it basically is the only way to do this since you can't bind arrays
	// to SQL parameters. We explicitly check each item in the array for numbers to try to avoid
	// any injections.
	for (let i=0; i<streams.length; ++i) {
		if (!streams[i].toString().match(/[0-9]+/))
			return callback(models.error("Stream values are not all numbers"));
	}
	streamsStr = streams.join();

	try {
		db = yield sal.connect();
		rows = yield sal.select(db,
			"select userid"
			+ " from subscription"
			+ " where streamid in (" + streamsStr + ")"
			+ " and state=?",
			[ dbconst.sub.active ]);

		for (let i=0; i<rows.length; ++i)
			ids.push(rows[i].userid);
		idsStr = ids.join();
		rows = yield sal.select(db, "select deviceid,servicetype,pushtoken,userid from device where userid in (" + idsStr + ")", []);

		return conclude(null, rows);
	}
	catch (err) {
		return conclude(models.error("Error finding devices for user", err));
	}
}, { noCallback: true });

// Callback should accept an error and an array of invites
function inviteListByStreamId(streamid, callback) {
	plainSelect("select subscription.streamid as streamid, stream.name as streamName, subscription.userid as userid, user.login as userLogin, user.name as userName"
			+ " from subscription"
			+ " inner join stream on subscription.streamid=stream.id"
			+ " inner join user on subscription.userid=user.id"
			+ " where subscription.streamid=?"
			+ " and subscription.state=?"
			+ " order by user.login",
		[ streamid, dbconst.sub.invited ],
		"Database error listing invites",
		callback);
}

// Callback should accept an error and an array of invites
function inviteListByUserId(userid, callback) {
	plainSelect("select subscription.streamid as streamid, stream.name as streamName, subscription.userid as userid, user.login as userLogin, user.name as userName"
			+ " from subscription"
			+ " inner join stream on subscription.streamid=stream.id"
			+ " inner join user on stream.userid=user.id"
			+ " where subscription.userid=?"
			+ " and subscription.state=?"
			+ " order by user.login",
		[ userid, dbconst.sub.invited ],
		"Database error listing invites",
		callback);
}

// Callback should accept an error and an array of invites. In case of error, a models.error() will be passed.
var inviteCreate = watt(function *(streamid, userid, callback) {
	var db, rows;

	var conclude = function() {
		sal.close(db);
		return callback(...arguments);
	};

	try {
		db = yield sal.connect();
		rows = yield sal.select(db,
			"select streamid, userid, state"
			+ " from subscription"
			+ " where streamid=? and userid=?",
			[ streamid, userid ]);

		if (rows.length) {
			if (rows[0].state == dbconst.sub.active) {
				return conclude(models.error("User is already subscribed to stream"));
			}
			else if (rows[0].state == dbconst.sub.invited) {
				return conclude(models.error("User is already invited to stream"));
			}
			else {
				// Set pending subscription to invited state
				yield sal.run(db,
					"update subscription"
					+ " set state=?"
					+ " where streamid=? and userid=?",
					[ dbconst.sub.invited, streamid, userid ]);
			}
		}
		else {
			// No pending subscription; create a new one in invited state
			yield sal.run(db,
				"insert into subscription(streamid, userid, state)"
				+ " values(?, ?, ?)",
				[ streamid, userid, dbconst.sub.invited ]);
		}
		return conclude();
	}
	catch (err) {
		return conclude(models.error("Database error inviting user to stream", err));
	}
}, { noCallback: true });

// Callback should accept an error and an array of invites. In case of error, a models.error() will be passed.
function inviteDelete(streamid, userid, callback) {
	checkThenRun("select streamid, userid from subscription where streamid=? and userid=? and state=?",
		[ streamid, userid, dbconst.sub.invited ],
		function(rows) {
			if (!rows.length) {
				return "User is not currently invited";
			}
		},
		"delete from subscription where streamid=? and userid=?",
		[ streamid, userid ],
		"Database error deleting invite",
		callback);
}

// Callback should accept an error and an invite
function inviteExists(streamid, callback) {
	plainSelect("select streamid, userid"
			+ " from subscription"
			+ " where streamid=? and userid=? and state=?",
		[ streamid, userid, dbconst.sub.invited ],
		"Database error checking invite",
		function(err, rows) {
			if (err)
				return callback(err);

			if (!rows.length)
				return callback(models.error("No invite found"));
			else
				return callback(null, rows[0]);
		});
}

// Callback should accept an error and array of invite requests
function inviteRequestListByStreamId(streamid, callback) {
	plainSelect("select subscription.streamid as streamid, stream.name as streamName, subscription.userid as userid, user.login as userLogin, user.name as userName"
		+ " from subscription"
		+ " inner join stream on subscription.streamid=stream.id"
		+ " inner join user on subscription.userid=user.id"
		+ " where subscription.streamid=? and subscription.state=?"
		+ " order by user.login",
		[ streamid, dbconst.sub.requested ],
		"Database error listing invite requests",
		callback);
}

// Callback should accept an error and an array of invite requests
function inviteRequestListByUserId(userid, callback) {
	plainSelect("select subscription.streamid as streamid, stream.name as streamName, subscription.userid as userid, user.login as userLogin, user.name as userName"
			+ " from subscription"
			+ " inner join stream on subscription.streamid=stream.id"
			+ " inner join user on stream.userid=user.id"
			+ " where subscription.userid=?"
			+ " and subscription.state=?"
			+ " order by user.login",
		[ userid, dbconst.sub.requested ],
		"Database error listing invite requests",
		callback);
}

// Callback should accept an error
var inviteRequestCreate = watt(function *(streamid, userid, callback) {
	var db, rows;

	var conclude = function() {
		sal.close(db);
		return callback(...arguments);
	}

	try {
		db = yield sal.connect();
		rows = yield sal.select(db,
			"select streamid, userid, state"
			+ " from subscription"
			+ " where streamid=? and userid=?",
			[ streamid, userid ]);

		if (rows.length) {
			switch (rows[0].state) {
				case dbconst.sub.active:
					return conclude(models.error("User is already subscribed to stream"));
					break;
				case dbconst.sub.invited:
					return conclude(models.error("User is already invited to stream"));
					break;
				case dbconst.sub.requested:
					return conclude(models.error("User already requested invite to stream"));
					break;
			}

			// Unkown state; update existing row to change state to requested
			yield sal.run(db,
				"update subscription"
				+ " set state=?"
				+ " where streamid=? and userid=?",
				[ dbconst.sub.requested, streamid, userid ]);
		}
		else {
			// No pending subscription; create a new one in invited state
			yield sal.run(db,
				"insert into subscription(streamid, userid, state)"
				+ " values(?, ?, ?)",
				[ streamid, userid, dbconst.sub.requested ]);
		}

		// Invite request was created above
		return conclude();
	}
	catch (err) {
		return conclude(models.error("Database error requesting invite", err));
	}
}, { noCallback: true });

// Callback should accept an error
function inviteRequestDelete(streamid, userid, callback) {
	checkThenRun("select streamid, userid"
		+ " from subscription"
		+ " where streamid=? and userid=? and state=?",
		[ streamid, userid, dbconst.sub.requested ],
		function(rows) {
			if (!rows) {
				return "Invite request not found";
			}
		},
		"delete from subscription"
		+ " where streamid=? and userid=? and state=?",
		[ streamid, userid, dbconst.sub.requested ],
		"Database error deleting invite request",
		callback);
}

// Callback should accept an error and an array of subscriptions
function subscriptionListByUserId(userid, callback) {
	plainSelect("select subscription.streamid as streamid, stream.name as streamName, user.id as userid, user.login as userLogin, user.name as userName"
			+ " from subscription"
			+ " inner join stream on subscription.streamid=stream.id"
			+ " inner join user on stream.userid=user.id"
			+ " where subscription.userid=?"
			+ " and subscription.state=?"
			+ " order by stream.name, user.login",
		[ userid, dbconst.sub.active ],
		"Database error listing subscriptions",
		callback);
}

// Callback should accept an error and an array of subscriptions
function subscriptionListByStreamId(streamid, callback) {
	plainSelect("select subscription.streamid as streamid, subscription.userid as userid, user.login as userLogin, user.name as userName"
		 	+ " from subscription"
			+ " inner join user on subscription.userid=user.id"
			+ " where subscription.streamid=?"
			+ " and subscription.state=?"
			+ " order by user.login",
		[ streamid, dbconst.sub.active ],
		"Database error listing subscriptions",
		callback);
}

// Callback should accept an error and an array of subscriptions. In case of error, a models.error() will be passed.
var subscriptionCreate = watt(function *(streamid, userid, callback) {
	var db, subscription, stream;

	var conclude = function() {
		sal.close(db);
		return callback(...arguments);
	};

	try {
		db = yield sal.connect();
		subscription = yield sal.select(db,
			"select streamid, userid, state"
			+ " from subscription"
			+ " where streamid=? and userid=?",
			[ streamid, userid ]);

		if (subscription.length) {
			// Subscription found
			if (subscription[0].state == dbconst.sub.active) {
				// If subscription is active, user is already subscribed
				return conclude(models.error("User is already subscribed to stream"));
			}
			else if (subscription[0].state == dbconst.sub.invited) {
				// If pending subscription is in invited state; activate it
				yield sal.run(db, "update subscription set state=? where streamid=? and userid=?", [ dbconst.sub.active, streamid, userid ]);
				return conclude();
			}
		}

		stream = yield sal.select(db,
			"select permission"
			+ " from stream"
			+ " where id=?",
			[ streamid ]);

		if (!stream.length) {
			return conclude(models.error("Stream not found"));
		}
		else if (stream[0].permission == dbconst.perms.public) {
			// Stream is public; allow subscription
			if (subscription.length) {
				// Pending subscription found; activate it
				yield sal.run(db, "update subscription set state=? where streamid=? and userid=?", [ dbconst.sub.active, streamid, userid ]);
			}
			else {
				// Insert new subscription
				yield sal.run(db, "insert into subscription(streamid, userid, state) values(?, ?, ?)", [ streamid, userid, dbconst.sub.active ]);
			}
			return conclude();
		}
		else {
			// We already checked for whether the user was invited above
			return conclude(models.error("No invite found"));
		}
	}
	catch (err) {
		return conclude(models.error("Database error subscribing to stream", err));
	}
}, { noCallback: true });

// Callback should accept an error and an array of subscriptions. In case of error, a models.error() will be passed.
function subscriptionDelete(streamid, userid, callback) {
	plainRun("delete from subscription where streamid=? and userid=?",
		[ streamid, userid ],
		"Database error deleting subscription",
		callback);
}

// Callback should accept an error and an array of subscriptions
function subscriptionExists(streamid, userid, callback) {
	plainSelect("select streamid, userid"
			+ " from subscription"
			+ " where streamid=? and userid=? and state=?",
		[ streamid, userid, dbconst.sub.active ],
		"Database error checking subscription",
		function(err, rows) {
			if (!rows.length)
				return callback(models.error("No subscription found"));
			else
				return callback(null, rows[0]);
		});
}

function subscriptionState(streamids, userid, callback) {
	plainSelect("select streamid, userid, state"
		+ " from subscription"
		+ " where streamid in(" + streamids + ")"
		+ " and userid=?",
		[ userid ],
		"Database error getting subscription state",
		callback);
}

module.exports = {
	userCreate: userCreate,
	userUpdate: userUpdate,
	userDelete: userDelete,
	userLogin: userLogin,
	userGetById: userGetById,
	userGetByLogin: userGetByLogin,
	userSearch: userSearch,
	streamList: streamList,
	streamContents: streamContents,
	streamInfo: streamInfo,
	streamCreate: streamCreate,
	streamModify: streamModify,
	streamDelete: streamDelete,
	streamSearch: streamSearch,
	imageAdd: imageAdd,
	imageGet: imageGet,
	imageComment: imageComment,
	imageGetStreams: imageGetStreams,
	imageAddStream: imageAddStream,
	imageRemoveStream: imageRemoveStream,
	imageCheckViewPermission: imageCheckViewPermission,
	imageCheckEditPermission: imageCheckEditPermission,
	pushServiceTypes: pushServiceTypes,
	deviceRegister: deviceRegister,
	deviceUnregister: deviceUnregister,
	deviceGetForStreams: deviceGetForStreams,
	inviteListByStreamId: inviteListByStreamId,
	inviteListByUserId: inviteListByUserId,
	inviteCreate: inviteCreate,
	inviteDelete: inviteDelete,
	inviteExists: inviteExists,
	inviteRequestListByStreamId: inviteRequestListByStreamId,
	inviteRequestListByUserId: inviteRequestListByUserId,
	inviteRequestCreate: inviteRequestCreate,
	inviteRequestDelete: inviteRequestDelete,
	subscriptionListByUserId: subscriptionListByUserId,
	subscriptionListByStreamId: subscriptionListByStreamId,
	subscriptionCreate: subscriptionCreate,
	subscriptionDelete: subscriptionDelete,
	subscriptionExists: subscriptionExists,
	subscriptionState: subscriptionState
};
