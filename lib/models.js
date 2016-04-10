/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

module.exports = {
	success: function() {
		return { success: true };
	},

	error: function(msg) {
		return { success: false, error: msg };
	},

	loginResponse: function(token) {
		return { success: true, token: token };
	},

	streamContents: function(rows) {
		return { success: true, images: rows };
	}
};
