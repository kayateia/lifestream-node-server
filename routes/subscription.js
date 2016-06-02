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

// Get list of subscriptions for the given user
router.get("/user/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		dbmod.subscriptionListByUserId(Number(req.params.id), function(err, subscriptions) {
			if (err) {
				return res.json(err);
			}
			res.json(models.subscriptionList(subscriptions));
		});
	});
});

// Get list of subscriptions for the given stream
router.get("/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		dbmod.subscriptionListByStreamId(Number(req.params.id), function(err, subscriptions) {
			if (err) {
				return res.json(err);
			}
			res.json(models.subscriptionList(subscriptions));
		});
	});
});

// Subscribe user to stream
router.post("/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		if (req.body.userid === undefined || Number(req.body.userid) < 1) {
			return res.json(models.error("Invalid 'userid'"));
		}

		dbmod.streamInfo(req.params.id, function(err, stream) {
			if (err) {
				return res.json(err);
			}

			// Only the owner of a stream may send subscriptions
			if (stream.userid != tokenContents.id) {
				return res.json(models.error("Permission denied"));
			}
			else {
				dbmod.subscriptionCreate(Number(req.params.id), Number(req.body.userid), function(err, subscriptions) {
					if (err) {
						return res.json(err);
					}
					res.json(models.success());
				});
			}
		});
	});
});

// Unsubscribe user from stream
router.delete("/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		if (req.query.userid === undefined || Number(req.query.userid) < 1) {
			return res.json(models.error("Invalid 'userid'"));
		}

		dbmod.streamInfo(req.params.id, function(err, stream) {
			if (err) {
				return res.json(err);
			}

			// Only the owner of a stream may revoke subscriptions
			if (stream.userid != tokenContents.id) {
				return res.json(models.error("Permission denied"));
			}
			else {
				dbmod.subscriptionDelete(Number(req.params.id), Number(req.query.userid), function(err) {
					if (err) {
						return res.json(err);
					}
					res.json(models.success());
				});
			}
		});
	});
});

module.exports = router;
