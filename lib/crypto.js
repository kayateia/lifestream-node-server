/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var crypto = require("crypto");

module.exports = {
	encrypt: function(str) {
		var shasum = crypto.createHash("sha1");
		shasum.update(str);
		return shasum.digest("hex");
	}
};
