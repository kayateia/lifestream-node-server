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
router.post("/list", function(req, res, next) {
	var token = req.body.token;
	if (!token)
		return res.json(models.error("Missing 'token'"));

	var tokenContents = lscrypto.validateToken(token);
	if (!tokenContents)
		return res.json(models.error("Token is invalid"));

	dbmod.streamList(tokenContents.id, function(streams, err) {
		if (err)
			res.json(model.error(err));
		res.json(streams);
	});
});

module.exports = router;
