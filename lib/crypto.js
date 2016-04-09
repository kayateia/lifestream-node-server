/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var crypto = require("crypto");
var shasum = crypto.createHash("sha1");

module.exports = {
	encrypt: function(str) {
		shasum.update(str);
		return shasum.digest("hex");
	}
};
