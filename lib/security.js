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

function validateToken(token) {
	try {
		var tokenContents = lscrypto.decryptJson(token);
	} catch(err) {
		return null;
	}

	if (!tokenContents.id || !tokenContents.login || !tokenContents.pwhash || !tokenContents.creationTime)
		return null;

	// Expire tokens after one hour.
	// We're not actually going to do this right now.
	/*var now = Date.now().getTime();
	if ((now - tokenContents.creationTime) > (1000*3600)) {
		return null;
	}*/
	
	// Expire token if the user's password has changed
	/*dbmod.userLogin(tokenContents.login, tokenContents.pwhash, function(err, id) {
		if (err) {
			return null;
		}

		return tokenContents;
	});*/
	// FIXME: async database call breaks the above because DB result comes
	// back after validateLogin() checks the return value, resulting in
	// the return value appearing to be undefined.
	// Skip password check for now until this is fixed.
	return tokenContents;
}

// Look for the bearer token on a request and pull it out and validate it. If we can't
// find it or it isn't valid, then bail on the request.
function validateLogin(req, res) {
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

	var tokenContents = validateToken(token);
	if (!tokenContents) {
		res.json(models.error("Token is invalid"));
		return;
	}

	return tokenContents;
}

module.exports = {
	makeToken: makeToken,
	validateLogin: validateLogin,
	validateToken: validateToken
};
