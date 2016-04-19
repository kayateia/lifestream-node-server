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

		dbmod.streamList(tokenContents.id, function(streams, err) {
			if (err) {
				return res.json(err);
			}
			res.json(streams);
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

		dbmod.streamContents(req.params.id, 50, function(err, rows) {
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
