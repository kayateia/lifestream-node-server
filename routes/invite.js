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

		// Validate stream ID
		var streamid = Number(req.params.id);
		if (Number.isNaN(streamid) || streamid < 1) {
			return res.json(models.error("Invalid 'streamid'"));
		}

		dbmod.inviteRequestListByStreamId(streamid, function(err, requests) {
			if (err) {
				return res.json(err);
			}
			res.json(models.inviteRequestList(requests));
		});
	});
});

// Get list of invite requests for the given user
router.get("/user/:id/request", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		// Validate user ID
		var userid = Number(req.params.id);
		if (Number.isNaN(userid) || userid < 1) {
			return res.json(models.error("Invalid 'userid'"));
		}

		dbmod.inviteRequestListByUserId(userid, function(err, requests) {
			if (err) {
				return res.json(err);
			}
			res.json(models.inviteRequestList(requests));
		});
	});
});

// Get list of invites for the given stream
router.get("/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		// Validate stream ID
		var streamid = Number(req.params.id);
		if (Number.isNaN(streamid) || streamid < 1) {
			return res.json(models.error("Invalid 'streamid'"));
		}

		dbmod.inviteListByStreamId(streamid, function(err, invites) {
			if (err) {
				return res.json(err);
			}
			res.json(models.inviteList(invites));
		});
	});
});

// Get list of invites for the given user
router.get("/user/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		// Validate user ID
		var userid = Number(req.params.id);
		if (Number.isNaN(userid) || userid < 1) {
			return res.json(models.error("Invalid 'userid'"));
		}

		dbmod.inviteListByUserId(userid, function(err, invites) {
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

		// Validate stream ID
		var streamid = Number(req.params.id);
		if (Number.isNaN(streamid) || streamid < 1) {
			return res.json(models.error("Invalid 'streamid'"));
		}

		// Validate user ID
		var userid = Number(req.body.userid);
		if (Number.isNaN(userid) || userid < 1) {
			return res.json(models.error("Invalid 'userid'"));
		}

		dbmod.streamInfo(streamid, function(err, stream) {
			if (err) {
				return res.json(err);
			}

			// Invites can only be requested for streams that need approval
			if (stream.permission != dbconst.perms.approval) {
				return res.json(models.error("Permission denied"));
			}
			else {
				dbmod.inviteRequestCreate(streamid, userid, function(err) {
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

		// Validate stream ID
		var streamid = Number(req.params.id);
		if (Number.isNaN(streamid) || streamid < 1) {
			return res.json(models.error("Invalid 'streamid'"));
		}

		// Validate user ID
		var userid = Number(req.body.userid);
		if (Number.isNaN(userid) || userid < 1) {
			return res.json(models.error("Invalid 'userid'"));
		}

		dbmod.streamInfo(streamid, function(err, stream) {
			if (err) {
				return res.json(err);
			}

			// Only the owner of a stream may send invites
			if (stream.userid != tokenContents.id) {
				return res.json(models.error("Permission denied"));
			}
			else {
				dbmod.inviteCreate(streamid, userid, function(err) {
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

		// Validate stream ID
		var streamid = Number(req.params.id);
		if (Number.isNaN(streamid) || streamid < 1) {
			return res.json(models.error("Invalid 'streamid'"));
		}

		// Validate user ID
		var userid = Number(req.query.userid);
		if (Number.isNaN(userid) || userid < 1) {
			return res.json(models.error("Invalid 'userid'"));
		}

		dbmod.streamInfo(streamid, function(err, stream) {
			if (err) {
				return res.json(err);
			}

			// Only the owner of a stream can delete others' invite requests.
			// Requestors can delete their own invite requests.
			if (stream.userid != tokenContents.id && userid != tokenContents.id) {
				return res.json(models.error("Permission denied"));
			}
			else {
				dbmod.inviteRequestDelete(streamid, userid, function(err) {
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

		// Validate stream ID
		var streamid = Number(req.params.id);
		if (Number.isNaN(streamid) || streamid < 1) {
			return res.json(models.error("Invalid 'streamid'"));
		}

		// Validate user ID
		var userid = Number(req.query.userid);
		if (Number.isNaN(userid) || userid < 1) {
			return res.json(models.error("Invalid 'userid'"));
		}

		dbmod.streamInfo(streamid, function(err, stream) {
			if (err) {
				return res.json(err);
			}

			// Only the owner of a stream may revoke invites to others,
			// but the recipient of an invite can revoke their own invite
			if (stream.userid != tokenContents.id && userid != tokenContents.id) {
				return res.json(models.error("Permission denied"));
			}
			else {
				dbmod.inviteDelete(streamid, userid, function(err) {
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
