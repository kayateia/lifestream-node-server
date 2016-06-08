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

// Get list of invite requests for the given stream
router.get("/:id/request", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		dbmod.inviteRequestList(Number(req.params.id), function(err, invites) {
			if (err) {
				return res.json(err);
			}
			res.json(models.inviteRequestList(invites));
		});
	});
});

// Get list of invites for the given stream
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

// Create invite request for stream
router.post("/:id/request", function(req, res, next) {
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

			// Invites can only be requested for streams that need approval
			if (stream.permission != dbconst.perms.approval) {
				return res.json(models.error("Permission denied"));
			}
			else {
				dbmod.inviteRequestCreate(Number(req.params.id), Number(req.body.userid), function(err) {
					if (err) {
						return res.json(err);
					}
					res.json(models.success());
				});
			}
		});
	});
});

// Create invite for stream
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

			// Only the owner of a stream may send invites
			if (stream.userid != tokenContents.id) {
				return res.json(models.error("Permission denied"));
			}
			else {
				dbmod.inviteCreate(Number(req.params.id), Number(req.body.userid), function(err) {
					if (err) {
						return res.json(err);
					}
					res.json(models.success());
				});
			}
		});
	});
});

// Cancel invite request for stream
router.delete("/:id/request", function(req, res, next) {
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

		dbmod.streamInfo(req.params.id, function(err, stream) {
			if (err) {
				return res.json(err);
			}

			// Only the owner of a stream can delete others' invite requests.
			// Requestors can delete their own invite requests.
			if (req.query.userid != tokenContents.id && stream.userid != tokenContents.id) {
				return res.json(models.error("Permission denied"));
			}
			else {
				dbmod.inviteRequestDelete(Number(req.params.id), Number(req.query.userid), function(err) {
					if (err) {
						return res.json(err);
					}
					res.json(models.success());
				});
			}
		});
	});
});

// Revoke invite for stream
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

			// Only the owner of a stream may revoke invites
			if (stream.userid != tokenContents.id) {
				return res.json(models.error("Permission denied"));
			}
			else {
				dbmod.inviteDelete(Number(req.params.id), Number(req.query.userid), function(err) {
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
