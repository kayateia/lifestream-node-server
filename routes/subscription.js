/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var express = require("express");
var router = express.Router();
var models = require("./../lib/models");
var dbmod = require("./../lib/db");
var dbconst = require("./../lib/dbconst");
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

// Get user's subscription state to one or more streams.
// A state is always returned for each stream requested, even if no
// corresponding row exists in the database subscription table.
router.get("/:id/state", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		// Validate user ID
		if (req.query.userid !== undefined) {
			req.query.userid = Number(req.query.userid);
		}
		if (!req.query.userid || Number.isNaN(req.query.userid)) {
			return res.json(models.error("Invalid 'userid'"));
		}

		// Sanitise comma-delimieted list by removing all non-numbers
		var ids = [];
		req.params.id.split(",").forEach(function(value, index, arr) {
			value = Number(value);
			if (!Number.isNaN(value)) {
				ids.push(value);
			}
		});
		var idsStr = ids.join(",");

		dbmod.subscriptionState(idsStr, req.query.userid, function(err, states) {
			if (err) {
				return res.json(err);
			}

			// Process each row returned from the database
			states.forEach(function(value, index, arr) {
				// For each streamid in the response from the database, remove
				// it from the array of streams that were originally requested
				ids.splice(ids.indexOf(value.streamid), 1);

				// Convert numeric states into words; discard unrecognised
				// states
				switch (value.state) {
					case dbconst.sub.active:
						arr[index].state = "active";
						break;
					case dbconst.sub.invited:
						arr[index].state = "invited";
						break;
					case dbconst.sub.requested:
						arr[index].state = "requested";
						break;
					default:
						arr[index].state = "none";
				}
			});

			// Any streams remaining in the array of streams that where
			// originally requested, did not match any rows in the database.
			// Append these streams to the database response with a state of
			// "none".
			ids.forEach(function(value) {
				states.push({
					streamid: value,
					userid: req.query.userid,
					state: "none"
				});
			});

			res.json(models.subscriptionStates(states));
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
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		if (err) {
			return res.json(err);
		}

		if (req.body.userid === undefined || Number(req.body.userid) < 1) {
			return res.json(models.error("Invalid 'userid'"));
		}

		// Users can't subscribe other users to streams
		if (req.body.userid != tokenContents.id && !isAdmin) {
			return res.json(models.error("Permission denied"));
		}

		dbmod.streamInfo(req.params.id, function(err, stream) {
			if (err) {
				return res.json(err);
			}
			dbmod.subscriptionCreate(Number(req.params.id), Number(req.body.userid), function(err, subscriptions) {
				if (err) {
					return res.json(err);
				}
				res.json(models.success());
			});
		});
	});
});

// Unsubscribe user from stream
router.delete("/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
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

			// Any user may unsubscribe themselves from a stream.
			// Only the owner of a stream may unsubscribe other users.
			if (stream.userid != tokenContents.id &&
				req.query.userid != tokenContents.id &&
				!isAdmin) {
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
