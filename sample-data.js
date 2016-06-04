/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia and Deciare

	Please see LICENSE for more info
 */

// This script will populate an empty database with usable sample data.
// The database MUST be empty except for rows that were inserted automatically
// during the DB creation process, or this script will not work correctly.
var request = require("request");
var fs = require("fs");
var lscrypto = require("./lib/lscrypto");
var security = require("./lib/security");

// Base URL
var baseUrl = "http://localhost:3000"

// List of users
var users = [
	{
		login: "deciare",
		name: "Deci",
		password: "pass",
		email: "",
		isAdmin: 1
	},
	{
		login: "alice",
		name: "Aleka",
		password: "pass",
		email: "",
		isAdmin: 0
	},
	{
		login: "bob",
		name: "Lopaka",
		password: "pass",
		email: "bob@example.com",
		isAdmin: 0
	},
	{
		login: "carol",
		name: "Kalola",
		password: "pass",
		email: "carol@example.com",
		isAdmin: 1
	},
	{
		login: "dave",
		name: "Kawe",
		password: "pass",
		email: "",
		isAdmin: 1
	}
]

// List of streams per user
var streams = [
	{
		name: "Stream",
		permission: 1
	},
	{
		name: "other stream",
		permission: 1
	},
	{
		name: "exclusive stream",
		permission: 2
	},
	{
		name: "secret stream",
		permission: 3
	}
];

// Authorization tokens for each user
var auth = {
	admin: {
		Authorization: "Bearer cf4c5b42c7da52bfb622424dd69715ac808029eae14e7b070aa14dc0586836b00707ebdd88f895bea2f9375a50a2e6d1ed6c62ec5b664d335ab503855f04febe802b3754960f0e367132dcaaff252902667c3f906694cca6a44bb7f49045c54aa5c5e7cc14eb70e326"
	}
};

// Map user IDs to user logins
var mapUserIdToLogin = {};

// Map logins to user IDs
var mapUserLoginToId = {};

// Map stream ID to owner user ID
var mapStreamIdToUserId = {};

// Map image ID to uploader user ID
var mapImageIdToUserId = {};

// Callback for dealing with errors
function callback(error, response, body) {
	if (error) {
		console.log(error);
	}
	else {
		console.log(response.statusCode + ": " + body)
	}
}

function createUser(login, password, name, email, isAdmin) {
	var req = {
		method: "POST",
		url: baseUrl + "/api/user/info/" + login,
		headers: auth.admin,
		form: {
			password: password,
			name: name,
			email: email,
			isadmin: isAdmin
		}
	};

	request(req, callback);
}

function createStream(userid, name, permission) {
	var req = {
		method: "POST",
		url: baseUrl + "/api/stream",
		headers: auth[mapUserIdToLogin[userid]],
		form: {
			userid: userid,
			name: name,
			permission: permission
		}
	};

	request(req, callback);
}

function uploadImage(streamid, filename, comment) {
	var req = {
		method: "POST",
		url: baseUrl + "/api/image/post",
		headers: auth[mapUserIdToLogin[mapStreamIdToUserId[streamid]]],
		formData: {
			streamid: streamid,
			image: fs.createReadStream(__dirname + "/" + filename),
			comment: comment
		}
	};

	request(req, callback);
}

function assocImageWithStream(imageid, streamid) {
	var req = {
		method: "POST",
		url: baseUrl + "/api/image/" + imageid + "/streams",
		headers: auth[mapUserIdToLogin[mapImageIdToUserId[imageid]]],
		form: {
			streamid: streamid
		}
	};

	request(req, callback);
}

function createInvite(streamid, userid) {
	var req = {
		method: "POST",
		url: baseUrl + "/api/invite/" + streamid,
		headers: auth[mapUserIdToLogin[mapStreamIdToUserId[streamid]]],
		form: {
			userid: userid
		}
	};

	request(req, callback);
}

function createSubscription(streamid, userid) {
	var req = {
		method: "POST",
		url: baseUrl + "/api/subscription/" + streamid,
		headers: auth.admin,
		form: {
			userid: userid
		}
	};

	request(req, callback);
}

// This is a terrible hack. To avoid SQLITE_BUSY errors, insert an artificial delay between each request.
var creep = 0;
var creepIncrement = 600;

users.forEach(function(user, index) {
	// Associate user ID with login
	mapUserIdToLogin[index + 2] = user.login;

	// Associate user login with ID
	mapUserLoginToId[user.login] = index + 2;

	// Generate auth token
	auth[user.login] = {
		Authorization: "Bearer " + security.makeToken(index + 2, user.login, lscrypto.hash(user.password))
	};

	// Create user
	/*setTimeout(function() {
		console.log("Creating user: " + user.login);
		createUser(user.login, user.password, user.name, user.email, user.isAdmin);
	}, creep += creepIncrement);*/
});

users.forEach(function(user, userIndex) {
	streams.forEach(function(stream, streamIndex) {
		// Associate new stream ID with user ID
		mapStreamIdToUserId[(streamIndex + 2) + (userIndex * streams.length)] = mapUserLoginToId[user.login];

		// Create stream
		/*setTimeout(function() {
			console.log("Creating stream: " + user.name + "'s " + stream.name);
			createStream(mapUserLoginToId[user.login], user.name + "'s " + stream.name, stream.permission);
		}, creep += creepIncrement);*/
	});
});

users.forEach(function(user, userIndex) {
	streams.forEach(function(stream, streamIndex) {
		for (var i = 1; i <= 10; i++) {
			let ii = i;
			let streamId = (streamIndex + 2) + (userIndex * streams.length);
			let imageId = userIndex * 20 + ii;

			if (streamIndex == 0) {
				// Associate image ID with uploader user ID
				mapImageIdToUserId[imageId] = mapStreamIdToUserId[streamId];
				mapImageIdToUserId[imageId + 10] = mapStreamIdToUserId[streamId];

				/*setTimeout(function() {
					console.log("Uploading image to " + user.name + "'s " + stream.name + " (id=" + streamId + ") as " + user.name + " (id=" + mapUserLoginToId[user.login] + "): " + __dirname + "/sample-images/" + user.login + "-landscape-" + ii + ".jpg");
					uploadImage(streamId,
						"sample-images/" + user.login + "-landscape-" + ii + ".jpg",
						 ii % 3 == 0 ? ii + " stars, would take again" : ""
					 );

					 console.log("Uploading image to " + user.name + "'s " + stream.name + " (id=" + streamId + ") as " + user.name + " (id=" + mapUserLoginToId[user.login] + "): " + __dirname + "/sample-images/" + user.login + "-portrait-" + ii + ".jpg");
					 uploadImage(streamId,
						 "sample-images/" + user.login + "-portrait-" + ii + ".jpg",
						  ii % 3 == 0 ? ii + " stars, would take again" : ""
					  );
				}, creep += creepIncrement);*/
			}
			else {
				/*setTimeout(function() {
					console.log("Associating image " + imageId + " with stream " + streamId);
					assocImageWithStream(imageId, streamId);

					console.log("Associating image " + (imageId + 10) + " with stream " + streamId);
					assocImageWithStream(imageId + 10, streamId);
				}, creep += creepIncrement);*/
			}
		}
	});
});

users.forEach(function(fromUser, fromUserIndex) {
	streams.forEach(function(stream, streamIndex) {
		users.forEach(function(toUser, toUserIndex) {
			var streamId = (streamIndex + 2) + (toUserIndex * streams.length);
			if (mapStreamIdToUserId[streamId] != mapUserLoginToId[fromUser.login]) {
				/*setTimeout(function() {
					console.log("Inviting " + fromUser.name + " to stream " + streamId);
					createInvite(streamId, mapUserLoginToId[fromUser.login]);
				}, creep += creepIncrement);*/
			}
		});
	});
});

users.forEach(function(fromUser, fromUserIndex) {
	streams.forEach(function(stream, streamIndex) {
		users.forEach(function(toUser, toUserIndex) {
			var streamId = (streamIndex + 2) + (toUserIndex * streams.length);
			if (streamId % toUserIndex != 0) {
				setTimeout(function() {
					console.log("Subscribing " + fromUser.name + " to stream " + streamId);
					createSubscription(streamId, mapUserLoginToId[fromUser.login]);
				}, creep += creepIncrement);
			}
		});
	});
});
