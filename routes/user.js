/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var express = require("express");
var router = express.Router();
var dbmod = require("./../lib/db");
var lscrypto = require("./../lib/lscrypto");
var models = require("./../lib/models");
var security = require("./../lib/security");

// Exchange an existing token for a new one with an extended expiration time.
router.get("/new-token", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		dbmod.userGetById(tokenContents.id, function(err, row) {
			if (err) {
				return res.json(err);
			}

			res.json(models.loginResponse(security.makeToken(tokenContents.id, row.login, row.pwhash)));
		});
	});
});

// Log in to the web site and get a bearer token.
router.post("/login/:login", function(req, res, next) {
	var login = req.params.login;
	if (!login)
		return res.json(models.error("Missing 'login'"));
	var pwd = req.body.password;
	if (!pwd)
		return res.json(models.error("Missing 'password'"));
	var pwhash = lscrypto.hash(pwd);
	console.log("Logging in user", login, pwhash);

	dbmod.userLogin(login, pwhash, function(err, id) {
		if (err)
			res.json(err);
		else {
			var response = security.makeToken(id, login, pwhash);
			res.json(models.loginResponse(response));
		}
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
		dbmod.userSearch(terms, function(err, results) {
			if (err) {
				return res.json(err);
			}
			res.json(models.userList(results));
		});
	});
});

// Register a device for push notifications. Parameters:
// id: a string uniquely identifying the device
// type: a string specifying the cloud service type (google, apple, microsoft)
// token: a string containing a token to be used when identifying the device to the push service
router.post("/register-device", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		var serviceType = req.body.type;
		console.log(serviceType);
		console.log(dbmod.pushServiceTypes);
		var serviceEnum = dbmod.pushServiceTypes[serviceType];
		if (serviceEnum === undefined)
			return res.json(models.error("Invalid service type", serviceType));

		dbmod.deviceRegister(tokenContents.id, req.body.id, serviceEnum, req.body.token, function(err) {
			if (err) {
				return res.json(err);
			}

			res.json(models.success());
		});
	});
});

// Retrieve information about a user by user login.
router.get("/login/:login", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		dbmod.userGetByLogin(req.params.login, function(err, row) {
			if (err) {
				return res.json(err);
			}

			res.json(models.userInfo({
				id: row.id,
				login: row.login,
				name: row.name,
				email: row.email,
				isAdmin: row.isAdmin
			}));
		});
	});
});

// Retrieve information about a user by ID.
router.get("/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		dbmod.userGetById(req.params.id, function(err, row) {
			if (err) {
				return res.json(err);
			}

			res.json(models.userInfo({
				id: row.id,
				login: row.login,
				name: row.name,
				email: row.email,
				isAdmin: row.isAdmin
			}));
		});
	});
});

// Modify a user.
router.put("/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		if (err) {
			return res.json(err);
		}

		var id = Number(req.params.id);
		if (Number.isNaN(id) || id < 1)
			return res.json(models.error("Invalid 'id'"));
		var name = req.body.name;
		if (!name)
			return res.json(models.error("Missing 'name'"));
		var pwd = req.body.password; // optional; leave password unchanged if blank
		var pwdhash = pwd ? lscrypto.hash(pwd) : null;
		var email = req.body.email ? req.body.email : "";

		// Only administrators should be able to modify the isAdmin flag.
		// Administrators cannot revoke their own administrator status.
		var admin = isAdmin;
		if (isAdmin && id != tokenContents.id) {
			admin = req.body.isAdmin ? 1 : 0;
		}

		// Any user can edit their own info, but only admins can edit other
		// users' info
		if (tokenContents.id != id && !isAdmin) {
			return res.json(models.error("Permission denied"));
		}

		// If no new password was specified, proceed to update the user
		if (!pwd || isAdmin) {
			dbmod.userUpdate(id, pwdhash, name, email, admin, function(err) {
				if (err) {
					return res.json(err);
				}

				res.json(models.success());
			});
		}
		// Otherwise, if the password was changed and the requestor is not an
		// admin, validate the requestor's identity by requiring the old
		// password
		else {
			dbmod.userLogin(login, pwhash, function(err, id) {
				if (err) {
					return res.json(err);
				}

				dbmod.userUpdate(id, pwdhash, name, email, admin, function(err) {
					if (err) {
						return res.json(err);
					}

					res.json(models.success());
				});
			});
		}
	});
});

router.delete("/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		if (err) {
			return res.json(err);
		}

		// Validate user ID
		var id = Number(req.params.id);
		if (Number.isNaN(id) || id < 1)
			return res.json(models.error("Invalid 'id'"));

		// Users can delete their own account.
		// Admins can delete anyone's account.
		if (tokenContents.id != id && !isAdmin) {
			return res.json(models.error("Permission denied"));
		}

		dbmod.userDelete(id, function(err) {
			if (err) {
				return res.json(err);
			}

			res.json(models.success());
		});
	});
});

// Add a user
router.post("/", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		if (err) {
			return res.json(err);
		}

		if (!isAdmin) {
			return res.json(models.error("Permission denied"));
		}

		var login = req.body.login;
		if (!login)
			return res.json(models.error("Missing 'login'"));
		var name = req.body.name;
		if (!name)
			return res.json(models.error("Missing 'name'"));
		var pwd = req.body.password;
		if (!pwd)
			return res.json(models.error("Missing 'password'"));
		var email = req.body.email ? req.body.email : "";
		var isAdmin = req.body.isAdmin ? 1 : 0;
		var pwdhash = lscrypto.hash(pwd);

		dbmod.userCreate(login, pwdhash, name, email, isAdmin, function(err, id) {
			if (err) {
				return res.json(err);
			}

			res.json(models.insertSuccess(id));
		});
	});
});

module.exports = router;
