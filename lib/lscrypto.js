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


module.exports = {
	hash: hash,
	encryptJson: encryptJson,
	decryptJson: decryptJson
};
