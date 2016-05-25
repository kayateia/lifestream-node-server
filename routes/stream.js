/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var express = require("express");
var router = express.Router();
var models = require("./../lib/models");
var dbmod = require("./../lib/db");
var lscrypto = require("./../lib/lscrypto");
var security = require("./../lib/security");

// Get the list of available streams.
router.get("/list", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		var includeHidden = req.query.userid == tokenContents.id;

		dbmod.streamList(Number(req.query.userid), includeHidden, function(err, streams) {
			if (err) {
				return res.json(err);
			}
			res.json(models.streamList(streams));
		});
	});
});

// Get the contents of a stream, sorted in reverse order by time,
// and with the specified limit. The maximum limit is 1000.
router.get("/:id/contents", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}
		// TODO: Check for stream access here.

		// Return the number of images requested. The maximum limit is 1000.
		// If an invalid number is specified, return 10 by default.
		var count = Number(req.query.count);
		if (!Number.isInteger(count) || count < 1) {
			count = 10;
		}
		else if (count > 1000) {
			count = 1000;
		}

		// Return images starting from the specified time. Images newer than
		// the specified time will be ignored.
		var olderThan = Number(req.query.olderThan);
		if (!Number.isInteger(olderThan) || olderThan < 1) {
			olderThan = null;
		}

		dbmod.streamContents(req.params.id, count, olderThan, function(err, rows) {
			if (err) {
				return res.json(err);
			}

			var images = [];
			for (var i=0; i<rows.length; ++i)
				images.push(models.image(rows[i].id, rows[i].fn, rows[i].userLogin, rows[i].uploadtime, rows[i].comment));

			res.json(models.streamContents(images));
		});
	});
});

module.exports = router;
