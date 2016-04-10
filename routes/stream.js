/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var express = require("express");
var router = express.Router();
var models = require("./../lib/models");
var dbmod = require("./../lib/db");
var lscrypto = require("./../lib/crypto");

// Get the list of available streams.
router.get("/list", function(req, res, next) {
	if (!security.validateToken(req, res))
		return;

	dbmod.streamList(tokenContents.id, function(streams, err) {
		if (err)
			res.json(models.error(err));
		res.json(streams);
	});
});

// Get the contents of a stream, sorted in reverse order by time,
// and with the specified limit. The maximum limit is 1000.
router.get("/:id/contents", function(req, res, next) {
	if (!security.validateToken(req, res))
		return;

	// TODO: Check for stream access here.

	dbmod.streamContents(req.params.id, 0, function(rows, err) {
		if (err)
			res.json(models.error(err));
		else
			res.json(models.streamContents(rows));
	});
});

module.exports = router;
