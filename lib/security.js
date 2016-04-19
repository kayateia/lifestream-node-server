/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var dbmod = require("./db");
var models = require("./models");
var lscrypto = require("./lscrypto");

function makeToken(userId, login, pwhash) {
	return lscrypto.encryptJson({
		id: userId,
		login: login,
		pwhash: pwhash,
		creationTime: Date.now()
	});
}

// Callback will receive a models.error() on error.
function validateToken(token, callback) {
	try {
		var tokenContents = lscrypto.decryptJson(token);
	} catch (err) {
		return callback(models.error("Token is invalid"));
	}

	if (!tokenContents.id || !tokenContents.login || !tokenContents.pwhash || !tokenContents.creationTime)
		return callback(models.error("Token is invalid"));

	// Expire tokens after one hour.
	// We're not actually going to do this right now.
	/*var now = Date.now().getTime();
	if ((now - tokenContents.creationTime) > (1000*3600)) {
		return null;
	}*/

	// Expire token if the user's password has changed
	dbmod.userLogin(tokenContents.login, tokenContents.pwhash, function(err, id, isAdmin) {
		if (err) {
			return callback(models.error("Token has expired"));
		}

		callback(null, tokenContents, isAdmin);
	});
}

// Look for the bearer token on a request and pull it out and validate it. If we can't
// find it or it isn't valid, then bail on the request.
// Callback will receive a models.error() on error.
function validateLogin(req, res, callback) {
	var auth = null;
	if (req.headers.authorization) {
		auth = req.headers.authorization;
	}
	else if (req.cookies.authorization) {
		auth = req.cookies.authorization;
	}

	if (!auth) {
		res.json(models.error("Missing bearer token"));
		return;
	}

	var token = auth.substring("Bearer ".length);

	validateToken(token, function(err, tokenContents, isAdmin) {
		if (err) {
			return callback(err);
		}

		return callback(null, tokenContents, isAdmin);
	});
}

module.exports = {
	makeToken: makeToken,
	validateLogin: validateLogin,
	validateToken: validateToken
};
