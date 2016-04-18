/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var request = require("request");

var dbmod = require("./db");

function notify(streams, callback) {
	dbmod.deviceGetForStreams(streams, function(err, rows) {
		var gcmkeys = [];
		for (var i=0; i<rows.length; ++i) {
			if (rows[i].servicetype != dbmod.pushServiceTypes.google) {
				console.log("Service type", rows[i].servicetype, "is not supported; skipping", rows[i].deviceid);
			} else {
				gcmkeys.push(rows[i].pushtoken);
			}
		}
		if (gcmkeys.length) {
			console.log("Sending to GCM keys:", gcmkeys);
			request.post({
				url: 'https://android.googleapis.com/gcm/send',
				json: true,
				body: {
					"registration_ids": gcmkeys,
					"data": { "message": "x" },
					"time_to_live": 3600,
					"collapse_key": "newpic"
				},
				headers: {
					"Authorization": "key=" + config.googleApiKey
				}
			}, function(err, httpResponse, body) {
				if (body.failure && body.results) {
					for (var i=0; i<body.results.length; ++i) {
						if (body.results[i].error) {
							console.log("De-registering device with token ", gcmkeys[i], ":", body.results[i].error);
							dbmod.deviceUnregister(gcmkeys[i], function(err) {
								if (err)
									console.log("Error unregistering device:", err);
							});
						}
					}
				}

				callback();
			});
		} else {
			console.log("No GCM keys to push!");
			callback();
		}
	});
}

module.exports = {
	notify: notify
};
