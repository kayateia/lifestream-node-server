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

// Add a user
router.post("/create", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(models.error(err));
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
		console.log("Create user",login,name,pwd);
		var pwdhash = lscrypto.hash(pwd);
		console.log("Would create with hash",pwdhash);

		dbmod.userCreate(login, pwdhash, name, function(err) {
			if (err) {
				return res.json(models.error(err));
			}

			res.json(models.success());
		});
	});
});

// Exchange an existing token for a new one with an extended expiration time.
router.get("/new-token", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(models.error(err));
		}

		dbmod.userGetById(tokenContents.id, function(err, row) {
			if (err) {
				return res.json(models.error("Server database error", err));
			}

			res.json(models.loginResponse(security.makeToken(tokenContents.id, row.login, row.pwhash)));
		});
	});
});

// Log in to the web site and get a bearer token.
router.post("/login", function(req, res, next) {
	var login = req.body.login;
	if (!login)
		return res.json(models.error("Missing 'login'"));
	var pwd = req.body.password;
	if (!pwd)
		return res.json(models.error("Missing 'password'"));
	var pwhash = lscrypto.hash(pwd);
	console.log("Logging in user", login, pwhash);

	dbmod.userLogin(login, pwhash, function(err, id) {
		if (err)
			res.json(models.error("Server datbase error", err));
		else {
			var response = security.makeToken(id, login, pwhash);
			res.json(models.loginResponse(response));
		}
	});
});

// Check whether a user exists.
router.get("/info/:login", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(models.error(err));
		}

		dbmod.userGetByLogin(req.params.login, function(err, row) {
			if (err) {
				return res.json(models.error("Server database error", err));
			}

			res.json(models.userInfo({
				id: row.id,
				login: req.params.login,
				name: row.name,
				email: row.email,
				isadmin: row.isadmin
			}));
		});
	});
});

module.exports = router;
