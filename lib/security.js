/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var models = require("./models");
var lscrypto = require("./crypto");

// Look for the bearer token on a request and pull it out and validate it. If we can't
// find it or it isn't valid, then bail on the request.
function validateToken(req, res) {
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

	var tokenContents = lscrypto.validateToken(token);
	if (!tokenContents) {
		res.json(models.error("Token is invalid"));
		return;
	}

	return tokenContents;
}

module.exports = {
	validateToken: validateToken
};
