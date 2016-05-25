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
router.get("/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		dbmod.inviteList(Number(req.params.id), function(err, invites) {
			if (err) {
				return res.json(err);
			}
			res.json(models.inviteList(invites));
		});
	});
});

module.exports = router;
