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
let perms = require("./perms");

//--------------------------------------------------------------------------------------------
// Conclude the Promise chain in progress by rejecting the promise.
// Arguments should be the same as what would be passed to the calling
// function's origimal callback.
function conclude() {
	var conclusion = arguments;
	return new Promise(function(resolve, reject) {
		reject([ ...conclusion ]);
	});
}

// Higher-order SQL functions

// Do a plain SQL select, calling the callback with the returned rows, or a models-wrapped errorMessage.
function plainSelect(statement, args, errorMessage, callback) {
	let db;
	sal.connect().then(function(conn) {
		db = conn;
		return sal.select(conn, statement, args);
	}).then(
		function(rows) {
			//console.log("plainSelect rows: ", rows);
			return conclude(null, rows);
		},
		function(err) {
			//console.log("plainSelect error: ", err);
			return conclude(err.length ? err[0] : models.error(errorMessage, err));
		}
	).catch(function(conclusion) {
		//console.log("plainSelect catch: ", conclusion);
		sal.close(db);
		callback(...conclusion);
	});
}

// Do a plain SQL run, calling the callback with the last insert ID (if applicable), or a models-wrapped errorMessage.
function plainRun(statement, args, errorMessage, callback) {
	let db;
	sal.connect().then(function(conn) {
		db = conn;
		return sal.run(conn, statement, args);
	}).then(
		function(lastId) {
			//console.log("plainRun rows: ", rows);
			return conclude(null, lastId);
		},
		function(err) {
			//console.log("plainRun error: ", err);
			return conclude(err.length ? err[0] : models.error(errorMessage, error));
		}
	).catch(function(conclusion) {
		//console.log("plainRun catch: ", conclusion);
		sal.close(db);
		callback(...conclusion);
	});
}

// Do a SQL select, calling the check function afterward; if the check function returns something truthy, it
// will be assumed to be an error message to be wrapped and thrown to the callback; otherwise, the runStatement
// is executed and the callback is called for success.
function checkThenRun(checkStatement, checkArgs, checkFunction, runStatement, runArgs, errorMessage, callback) {
	let db;
	sal.connect().then(function(conn) {
		db = conn;
		return sal.select(db, checkStatement, checkArgs);
	}).then(
		function(rows) {
			//console.log("checkThenRun checkFunction: ", rows);
			let error = checkFunction(rows);
			if (error) {
				//console.log("checkThenRun checkFunction error: ", error);
				return conclude(models.error(error));
			}
			return sal.run(db, runStatement, runArgs);
		}
	).then(
		function(lastId) {
			//console.log("checkThenRun rows: ", rows);
			return conclude(null, lastId);
		},
		function(err) {
			//console.log("checkThenRun error: ", err);
			return conclude(err.length ? err[0] : models.error(errorMessage, err));
		}
	).catch(function(conclusion) {
		//console.log("checkThenRun catch: ", conclusion);
		sal.close(db);
		callback(...conclusion);
	});
}

//--------------------------------------------------------------------------------------------

// Callback should take an error argument. In case of error, a models.error() will be passed.
function userCreate(login, passwordHash, name, email, isadmin, callback) {
	console.log("Creating user", login);
	checkThenRun("select * from user where login=?", [ login ],
		function(rows) {
			if (rows.length)
				return "User already exists";
		},
		"insert into user(login, pwhash, name, email, isadmin) values (?,?,?,?,?)",
		[ login, passwordHash, name, email, isadmin ],
		"Database error creating user",
		callback);
}

// Callback should take an error argument. In case of error, a models.error() will be passed.
function userUpdate(login, passwordHash, name, email, isadmin, callback) {
	console.log("Modifying user",login);

	let args = [ name, email, isadmin ];
	if (passwordHash)
		args.push(passwordHash);
	args.push(login);

	checkThenRun("select * from user where login=?", [ login ],
		function(rows) {
			if (!rows.length)
				return "User doesn't exist";
		},
		"update user "
			+ "set name=?,"
			+ "    email=?,"
			+ "    isadmin=? "
			+ ( passwordHash ? "    ,pwhash=? " : "" )
			+ "where login=?",
		args,
		"Database error updating user record", callback);
}

// Callback should take an error argument. In case of error, a models.error() will be passed.
function userDelete(login, callback) {
	let db;
	let exit = {};
	sal.connect().then(function(conn) {
		db = conn;
		console.log("Deleting user " + login);

		return sal.select(db, "select * from user where login=?", [ login ]);
	}).then(function(rows) {
		if (!rows.length) {
			return conclude(models.error("User " + login + " doesn't exist"));
		}

		let userid = rows[0].id;

		// Lots to do here, so we use a transaction
		return sal.transact(db,
			// Delete pending invites to user
			"delete from invitation where userid=?;"
			// Delete pending invites to streams owned by user
			+ "delete from invitation where streamid in("
				+ "   select id from stream"
				+ "   where userid=?"
				+ " );"
			// Unsubscribe user from all streams
			+ "delete from subscription where userid=?;"
			// Unsubscribe all users from this user's streams
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
	}).then(
		function(lastId) {
			return conclude(null, lastId);
		},
		function(err) {
			return conclude(err.length ? err[0] : models.error("Database error deleting user", err));
		}
	).catch(function(conclusion) {
		sal.close(db);
		callback(...conclusion);
	});
}

// Callback should take an error argument, id, and isAdmin flag. In case of error, a models.error() will be passed.
function userLogin(login, passwordHash, callback) {
	plainSelect("select id, isadmin from user where login=? and pwhash=?", [ login, passwordHash ],
		"Databse error looking up user",
		function(err, rows) {
			if (err) {
				callback(err);
			}
			else if (rows.length) {
				callback(null, rows[0].id, rows[0].isadmin);
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
	plainSelect("select id,login,pwhash,name,email,enabled,isadmin from user where id=?", [ id ],
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
	plainSelect("select id,login,pwhash,name,email,enabled,isadmin from user where login=?", [ login ],
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
			+ (!includeHidden ? " and permission != " + perms.hidden : "")
			+ (userid > 0 ? " and userid=" + userid : "")
			+ " order by stream.id",
			[],
			"Database error listing streams",
			callback);
}

// streamid may be a number or a comma-delimited list of numbers.
// Callback should take an error argument and an array of images. In case of error, a models.error() will be passed.
function streamContents(streamid, maxnum, olderthan, callback) {
	let queryString = "select image.id as id, image.fn as fn, user.login as userLogin, user.name as userName, image.uploadtime as uploadtime, image.comment as comment, count(streamimage.streamid) as streamcount"
		+ " from image"
		+ " inner join user on image.userid=user.id"
		+ " inner join streamimage on image.id=streamimage.imageid"
		+ " where streamimage.streamid in(" + streamid + ")"
		+ (olderthan ? " and image.uploadtime < ?" : "")
		+ " group by image.id"
		+ " order by image.uploadtime desc"
		+ " limit ?";
	let args = [];
	if (olderthan)
		args.push(olderthan);
	args.push(maxnum);

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
function streamDelete(streamid, callback) {
	let db;
	sal.connect().then(function(conn) {
		db = conn;

		// Much to do, so do it in a transaction.
		return sal.transact(db,
			// Revoke all invites for this stream.
			"delete from invitation where streamid=?;"
			// Unsubscribe all users from stream.
			+ "delete from subscription where streamid=?;"
			// Disassociate all images from this stream.
			+ "delete from streamimage where streamid=?;"
			// Delete the stream.
			+ "delete from stream where id=?",
			[ streamid, streamid, streamid, streamid ]);
	}).then(
		function() {
			return conclude();
		},
		function(err) {
			return conclude(models.error("Database error deleting stream", err));
		}
	).catch(function(conclusion) {
		sal.close(db);
		callback(...conclusion);
	});
}

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
		+ " where stream.permission in(" + perms.public + "," + perms.approval + ") and ("
		+ conditions
		+ ")",
		subterms,
		"Database error searching streams",
		callback);
}

// Callback should take an error argument. In case of error, a models.error() will be passed.
function imageAdd(userid, streamids, filename, comment, callback) {
	let db;
	let imageId;
	sal.connect().then(function(conn) {
		db = conn;
		return sal.run(db, sal.getTransactStartSql(), []);
	}).then(function() {
		return sal.run(db, "insert into image(userid, fn, comment, uploadtime) values (?,?,?,?)",
			[ userid, filename, comment, Math.trunc(Date.now() / 1000) ]);
	}).then(function(rowId) {
		console.log("inserted image", rowId);
		imageId = rowId;

		let promises = [];
		for (let i=0; i<streamids.length; ++i) {
			promises.push(sal.run(db, "insert into streamimage(streamid, imageid) values (?,?)",
				[ streamids[i], rowId ]));
		}

		return Promise.all(promises);
	}).then(
		function() {
			// All insertions succeeded
			return sal.run(db, "commit");
		},
		function(err) {
			// At least one insertion failed
			return sal.run(db, "rollback").then(
				function() {
					// Rollback succeeded
					return conclude(models.error("Error adding image to database", err));
				},
				function(err) {
					// Rollback failed
					return conclude(models.error("Error rolling back image add", err));
				}
			);
		}
	).then(
		function() {
			// Commit succeeded
			return conclude(null, imageId);
		}
	).catch(function(conclusion) {
		sal.close(db);
		callback(...conclusion);
	});
}

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
function imageCheckViewPermission(imageid, userid, callback) {
	let db;
	let exit = {};
	sal.connect().then(function(conn) {
		db = conn;
		return sal.select(db, "select image.id"
			+ " from image"
			+ " where image.id=? and image.userid=?",
			[ imageid, userid ]);
	}).then(function(rows) {
		if (rows.length) {
			// Uploader always has permission to view their own image
			return conclude();
		}

		return sal.select(db, "select streamimage.streamid"
							+ " from streamimage"
							+ " inner join stream on streamimage.streamid=stream.id"
							+ " where streamimage.imageid=?"
							+ " and stream.permission=?"
							+ " limit 1",
			[ imageid, perms.public ]);
	}).then(function(rows) {
		if (rows.length) {
			// Anyone can view an image contained in at least one public stream
			return conclude();
		}

		return sal.select(db, "select subscription.streamid"
							+ " from subscription"
							+ " inner join streamimage on subscription.streamid=streamimage.streamid"
							+ " where streamimage.imageid=?"
							+ " and subscription.userid=?"
							+ " limit 1",
			[ imageid, userid ]);
	}).then(
		function(rows) {
			if (rows.length) {
				// User can view image if it is in at least one stream to which they subscribe
				return conclude();
			} else {
				return conclude(models.error("Permission denied"));
			}
		},
		function(err) {
			if (typeof err === "object") {
				// If err is an object, it is either an array containing a wrapped
				// error message, or an error from the database. Disambiguate
				// and pass it on.
				return conclude(err instanceof Array ? err[0] : models.error("Database error checking permission to view image", err));
			}
			else {
				// If err has no length, it is a zero-element array from an earlier
				// conclude(null), and therefore a success condition. Pass it on.
				return conclude();
			}
		}
	).catch(function(conclusion) {
		sal.close(db);
		callback(...conclusion);
	});
}

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
function deviceRegister(userId, deviceId, serviceType, token, callback) {
	let db;
	sal.connect().then(function(conn) {
		db = conn;
		return sal.select(db, "select id from device where deviceid=? and servicetype=? and userid=?",
			[ deviceId, serviceType, userId ]);
	}).then(function(rows) {
		if (rows.length > 0) {
			// We need to update here, not insert.
			return sal.run(db, "update device set pushtoken=? where id=?",
				[ token, rows[0].id ]);
		} else {
			// We need to insert a new entry.
			return sal.run(db, "insert into device (deviceid, servicetype, pushtoken, userid) values (?,?,?,?)",
				[ deviceId, serviceType, token, userId ]);
		}
	}).then(
		function() {
			return conclude();
		},
		function(err) {
			return conclude(models.error("Error registering device", err));
		}
	).catch(function(conclusion) {
		sal.close(db);
		callback(...conclusion);
	});
}

// Unregisters a previously registered device. Token should be sufficient
// to identify the device. In case of error, a models.error() will be passed.
function deviceUnregister(token, callback) {
	plainRun("delete from device where pushtoken=?",
		[ token ],
		"Error unregistering device",
		callback);
}

// Streams should be an array of integer stream IDs. In case of error, a models.error() will be passed.
function deviceGetForStreams(streams, callback) {
	console.log("deviceGetForStreams");

	// This is really bad, but it basically is the only way to do this since you can't bind arrays
	// to SQL parameters. We explicitly check each item in the array for numbers to try to avoid
	// any injections.
	for (let i=0; i<streams.length; ++i) {
		if (!streams[i].toString().match(/[0-9]+/))
			return callback(models.error("Stream values are not all numbers"));
	}
	let streamsStr = streams.join();

	let db;
	sal.connect().then(function(conn) {
		db = conn;
		return sal.select(db, "select userid from subscription where streamid in (" + streamsStr + ")", []);
	}).then(function(rows) {
		let ids = [];
		for (let i=0; i<rows.length; ++i)
			ids.push(rows[i].userid);
		let idsStr = ids.join();
		return sal.select(db, "select deviceid,servicetype,pushtoken,userid from device where userid in (" + idsStr + ")", []);
	}).then(
		function(rows) {
			return conclude(rows);
		},
		function(err) {
			return conclude(models.error("Error finding devices for user", err));
		}
	).catch(function(conclusion) {
		sal.close(db);
		callback(...conclusion);
	});
}

// Callback should accept an error and an array of invites
function inviteList(streamid, callback) {
	plainSelect("select invitation.streamid as streamid, invitation.userid as userid, user.login as userLogin, user.name as userName"
			+ " from invitation"
			+ " inner join user on invitation.userid=user.id"
			+ " where streamid=?"
			+ " order by user.login",
		[ streamid ],
		"Database error listing invites",
		callback);
}

// Callback should accept an error and an array of invites. In case of error, a models.error() will be passed.
function inviteCreate(streamid, userid, callback) {
	checkThenRun("select streamid, userid from invitation where streamid=? and userid=?",
		[ streamid, userid ],
		function(rows) {
			if (rows && rows.length)
				return "User has already been invited to stream";
		},
		"insert into invitation(streamid, userid) values(?, ?)",
		[ streamid, userid ],
		"Database error inviting user to stream",
		callback);
}

// Callback should accept an error and an array of invites. In case of error, a models.error() will be passed.
function inviteDelete(streamid, userid, callback) {
	plainRun("delete from invitation where streamid=? and userid=?",
		[ streamid, userid ],
		"Database error deleting invite",
		callback);
}

// Callback should accept an error and an array of invites
function inviteExists(streamid, userid, callback) {
	plainSelect("select streamid, userid"
			+ " from invitation"
			+ " where streamid=? and userid=?",
		[ streamid, userid ],
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

// Callback should accept an error and an array of subscriptions
function subscriptionListByUserId(userid, callback) {
	plainSelect("select subscription.streamid as streamid, stream.name as streamName, user.id as userid, user.login as userLogin, user.name as userName"
			+ " from subscription"
			+ " inner join stream on subscription.streamid=stream.id"
			+ " inner join user on stream.userid=user.id"
			+ " where subscription.userid=?"
			+ " order by stream.name, user.login",
		[ userid ],
		"Database error listing subscriptions",
		callback);
}

// Callback should accept an error and an array of subscriptions
function subscriptionListByStreamId(streamid, callback) {
	plainSelect("select subscription.streamid as streamid, subscription.userid as userid, user.login as userLogin, user.name as userName"
		 	+ " from subscription"
			+ " inner join user on subscription.userid=user.id"
			+ " where streamid=?"
			+ " order by user.login",
		[ streamid ],
		"Database error listing subscriptions",
		callback);
}

// Callback should accept an error and an array of subscriptions. In case of error, a models.error() will be passed.
function subscriptionCreate(streamid, userid, callback) {
	let db;
	let exit = {};
	sal.connect().then(function(conn) {
		db = conn;

		return sal.select(db, "select streamid, userid from subscription where streamid=? and userid=?",
			[ streamid, userid ]);
	}).then(function(rows) {
		if (rows.length) {
			// User is already subscribed
			return conclude(models.error("User is already subscribed to stream"));
		}

		return sal.select(db, "select permission"
					+ " from stream"
					+ " where id=?",
					[ streamid ]);
	}).then(function(rows) {
		if (!rows.length) {
			return conclude(models.error("Stream not found"));
		} else if (rows[0].permission == perms.public) {
			// Stream is public; allow subscription
			return sal.run(db, "insert into subscription(streamid, userid) values(?, ?)", [ streamid, userid ]).then(function(lastId) {
				return conclude();
			});
		} else {
			// Stream is private; check for invite
			return sal.select(db, "select streamid, userid"
				+ " from invitation"
				+ " where streamid=? and userid=?",
				[ streamid, userid ]);
		}
	}).then(function(rows) {
		if (!rows.length) {
			return conclude(models.error("No invite found"));
		}

		// Invite found; consume invite
		return sal.run(db, "delete from invitation"
			+ " where streamid=? and userid=?",
			[ streamid, userid ]);
	}).then(function() {
		// Allow subscription
		return sal.run(db, "insert into subscription(streamid, userid) values(?, ?)",
			[ streamid, userid ]);
	}).then(function() {
		return conclude();
	}).then(null, function(err) {
		if (typeof err === "object") {
			// If err is an object, it is either an array containing a wrapped
			// error message, or an error from the database. Disambiguate
			// and pass it on.
			return conclude(err instanceof Array ? err[0] : models.error("Database error subscribing to stream", err));
		}
		else {
			// If err has no length, it is a zero-element array from an earlier
			// conclude(null), and therefore a success condition. Pass it on.
			return conclude();
		}
	}).catch(function(conclusion) {
		sal.close(db);
		callback(...conclusion);
	});
}

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
			+ " where streamid=? and userid=?",
		[ streamid, userid ],
		"Database error checking subscription",
		function(err, rows) {
			if (!rows.length)
				return callback(models.error("No subscription found"));
			else
				return callback(null, rows[0]);
		});
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
	inviteList: inviteList,
	inviteCreate: inviteCreate,
	inviteDelete: inviteDelete,
	inviteExists: inviteExists,
	subscriptionListByUserId: subscriptionListByUserId,
	subscriptionListByStreamId: subscriptionListByStreamId,
	subscriptionCreate: subscriptionCreate,
	subscriptionDelete: subscriptionDelete,
	subscriptionExists: subscriptionExists
};
