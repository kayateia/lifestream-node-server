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

// Search for streams by substring of stream name
router.get("/search", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		if (err) {
			return res.json(err);
		}

		// TODO: some fancier search logic. For now, just pass the terms on to
		// the DB
		var terms = [ req.query.q.trim() ];
		if (!terms[0]) {
			return res.json(models.error("No search terms given"));
		}

		//var terms = req.query.q.split(" ");
		dbmod.streamSearch(terms, function(err, results) {
			if (err) {
				return res.json(err);
			}
			res.json(models.streamList(results));
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

		// Sort order of results. Defauls to putting newer images first
		var direction = "-1";

		// Return images starting from the specified time. Images newer than
		// the specified time will be ignored.
		var fromTime = Number(req.query.olderThan);
		if (!Number.isInteger(fromTime) || fromTime < 1) {
			fromTime = null;
		}
		// Alternatively, return images starting from the specified time. Images
		// older than the specified time will be ignored.
		if (!fromTime) {
			fromTime = Number(req.query.newerThan);
			if (!Number.isInteger(fromTime) || fromTime < 0) {
				fromTime = null;
			}
			else {
				// Results put older images first
				direction = "1";
			}
		}

		// Return images with IDs lower than the specfied ID
		var fromId = Number(req.query.olderThanId);
		if (!Number.isInteger(fromId) || fromId < 1) {
			fromId = null;
		}
		// Alternatively, return images with IDs higher than the specfied ID
		if (!fromId) {
			fromId = Number(req.query.newerThanId);
			if (!Number.isInteger(fromId) || fromId < 0) {
				fromId = null;
			}
			else {
				// Results put older images first
				direction = "1";
			}
		}

		// Supposing the :id parameter is a comma-delimited string, convert it
		// into an array, and keep only the numbers
		var ids = [];
		var includeOrphans = false;
		req.params.id.split(",").forEach(function(value) {
			value = Number(value);
			if (!Number.isNaN(value)) {
				if (value > 0) {
					ids.push(value);
				}
				else if (value == 0) {
					includeOrphans = true;
				}
			}
		});
		if (ids.length == 0 && includeOrphans == false) {
			return res.json(models.error("No streams specified"));
		}
		// Rejoin numeric IDs into sanitised comma-delimited string
		req.params.id = ids.join(",");

		dbmod.streamContents(req.params.id, includeOrphans, count, fromTime, fromId, direction, tokenContents.id, function(err, rows) {
			if (err) {
				return res.json(err);
			}

			var images = [];
			for (var i=0; i<rows.length; ++i)
				images.push(models.image(rows[i].id, rows[i].fn, rows[i].userid, rows[i].userLogin, rows[i].userName, rows[i].uploadtime, rows[i].comment));

			res.json(models.streamContents(images));
		});
	});
});

router.get("/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		if (err) {
			return res.json(err);
		}

		// Validate stream ID
		var streamid = Number(req.params.id);
		if (Number.isNaN(streamid) || streamid < 1) {
			return res.json(models.error("Invalid 'streamid'"));
		}

		dbmod.streamInfo(streamid, function(err, stream) {
			if (err) {
				return res.json(err);
			}

			res.json(models.streamInfo(stream));
		});
	});
});

router.post("/", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		if (err) {
			return res.json(err);
		}

		// Validate stream name
		if (!req.body.name) {
			return res.json(models.error("Stream name cannot be blank"));
		}

		// Non-admin users can only create streams belonging to themselves
		if (req.body.userid != tokenContents.id && !isAdmin) {
			return res.json(models.error("Permission denied"));
		}

		dbmod.streamCreate(Number(req.body.userid), req.body.name, Number(req.body.permission), function(err, id) {
			if (err) {
				return res.json(err);
			}

			res.json(models.insertSuccess(id));
		});
	});
});

router.put("/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		if (err) {
			return res.json(err);
		}

		// Validate stream ID
		var streamid = Number(req.params.id);
		if (Number.isNaN(streamid) || streamid < 1) {
			return res.json(models.error("Invalid 'streamid'"));
		}

		// Check whether any changes were requested
		if (!req.body.name && !Number(req.body.permission)) {
			// Nothing to do
			res.json(models.error("No changes requested"));
		}

		dbmod.streamInfo(streamid, function(err, stream) {
			if (err) {
				return res.json(err);
			}

			if (stream.userid != tokenContents.id && !isAdmin) {
				return res.json(models.error("Permission denied"));
			}

			dbmod.streamModify(req.params.id, req.body.name, Number(req.body.permission), function(err) {
				if (err) {
					return res.json(err);
				}

				res.json(models.success());
			});
		});
	});
});

router.delete("/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		if (err) {
			return res.json(err);
		}

		// Validate stream ID
		var streamid = Number(req.params.id);
		if (Number.isNaN(streamid) || streamid < 1) {
			return res.json(models.error("Invalid 'id'"));
		}

		dbmod.streamInfo(streamid, function(err, stream) {
			if (err) {
				return res.json(err);
			}

			if (stream.userid != tokenContents.id && !isAdmin) {
				return res.json(models.error("Permission denied"));
			}

			dbmod.streamDelete(streamid, function(err) {
				if (err) {
					return res.json(err);
				}

				res.json(models.success());
			});
		});
	});
});

module.exports = router;
