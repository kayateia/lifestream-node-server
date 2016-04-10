/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var crypto = require("crypto");

function hash(str) {
	var shasum = crypto.createHash("sha1");
	shasum.update(str);
	return shasum.digest("hex");
}

function encryptText(text) {
	// Obviously this isn't going to fly for long term usage. Should read
	// this password from a file on the server.
	var cipher = crypto.createCipher("aes-256-ctr", "thisisapassword!");
	var crypted = cipher.update(text, "utf8", "hex");
	crypted += cipher.final("hex");
	return crypted;
}

function decryptText(hex) {
	var cipher = crypto.createDecipher("aes-256-ctr", "thisisapassword!");
	var dec = cipher.update(hex, "hex", "utf8");
	dec += cipher.final("utf8");
	return dec;
}

function encryptJson(json) {
	return encryptText(JSON.stringify(json));
}

function decryptJson(hex) {
	return JSON.parse(decryptText(hex));
}

function makeToken(userId, login) {
	return encryptJson({
		id: userId,
		login: login,
		creationTime: Date.now()
	});
}

function validateToken(token) {
	try {
		var tokenContents = decryptJson(token);
	} catch(err) {
		return null;
	}

	if (!tokenContents.id || !tokenContents.login || !tokenContents.creationTime)
		return null;

	// Expire tokens after one hour.
	// We're not actually going to do this right now.
	/*var now = Date.now().getTime();
	if ((now - tokenContents.creationTime) > (1000*3600)) {
		return null;
	}*/

	return tokenContents;
}

module.exports = {
	hash: hash,
	encryptJson: encryptJson,
	decryptJson: decryptJson,
	makeToken: makeToken,
	validateToken: validateToken
};
