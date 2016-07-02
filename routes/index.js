/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var express = require("express");
var router = express.Router();
var models = require("./../lib/models");
var lscrypto = require("./../lib/lscrypto");
var security = require("./../lib/security");

/* GET home page. */
router.get("/", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		var templateVars = {
			isAdmin: isAdmin ? true: false,
			userid: tokenContents ? tokenContents.id : null,
			userLogin: tokenContents ? tokenContents.login : null,
			title: "LifeStream"
		}
		res.render("index", templateVars);
	});
});
router.get("/gallery", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		var templateVars = {
			isAdmin : isAdmin ? true: false,
			userid: tokenContents ? tokenContents.id : null,
			userLogin: tokenContents ? tokenContents.login : null,
			title: "LifeStream - Gallery"
		}

		// Not logged in; redirect to login page
		if (!tokenContents) {
			return res.redirect(302, "login?reason=session_timeout&fromUrl=" + encodeURIComponent(req.originalUrl));
		}

		if (isAdmin) {
			templateVars.isAdmin = true;
		}

		res.render("gallery", templateVars);
	});
});
router.get("/login", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		var templateVars = {
			fromUrl: req.query.fromUrl,
			isAdmin: isAdmin ? true : false,
			message: null,
			userid: tokenContents ? tokenContents.id : null,
			userLogin: tokenContents ? tokenContents.login : null,
			title: "LifeStream - Sign in"
		};

		// Already logged in
		if (tokenContents) {
			// Redirect user to the URL they were trying to access before they
			// were redirected to the login page.
			//
			// If they're just logging in for the first time, redirect to the
			// gallery page.
			console.log("Redirect to: " + req.query.fromUrl);
			res.redirect(302, req.query.fromUrl ? req.query.fromUrl : "gallery");
		}

		if (req.query.reason) {
			switch (req.query.reason) {
				case "failed_login":
					templateVars.message = {
						type: "danger",
						text: req.query.detail
					};
					break;
				case "logout":
					templateVars.message = {
						type: "info",
						text: "You have logged out of this device. If other LifeStream clients are logged in to your account, they will remain logged in."
					};
					break;
				case "session_timeout":
					templateVars.message = {
						type: "danger",
						text: "Your session has expired. To continue using LifeStream, you will need to sign in again."
					};
					break;
				case "successful_login":
					templateVars.message = {
						type: "success",
						text: "You have logged in successfully."
					};
			}
		}

		res.render("login", templateVars);
	});
});
router.get("/streams", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		var templateVars = {
			isAdmin: isAdmin ? true: false,
			userid: tokenContents ? tokenContents.id : null,
			userLogin: tokenContents ? tokenContents.login : null,
			title: "LifeStream - Streams"
		}

		// Not logged in; redirect to login page
		if (!tokenContents) {
			return res.redirect(302, "login?reason=session_timeout&fromUrl=" + encodeURIComponent(req.originalUrl));
		}

		res.render("streams", templateVars);
	});
});
router.get("/upload", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		var templateVars = {
			isAdmin: isAdmin ? true: false,
			userid: tokenContents ? tokenContents.id : null,
			userLogin: tokenContents ? tokenContents.login : null,
			title: "LifeStream - Upload"
		}

		// Not logged in; redirect to login page
		if (!tokenContents) {
			return res.redirect(302, "login?reason=session_timeout&fromUrl=" + encodeURIComponent(req.originalUrl));
		}

		res.render("upload", templateVars);
	});
});
router.get("/usermgr", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents, isAdmin) {
		var templateVars = {
			isAdmin: isAdmin ? true: false,
			userid: tokenContents ? tokenContents.id : null,
			userLogin: tokenContents ? tokenContents.login : null,
			title: "LifeStream - User manager"
		}

		// Not logged in; redirect to login page
		if (!tokenContents) {
			return res.redirect(302, "login?reason=session_timeout&fromUrl=" + encodeURIComponent(req.originalUrl));
		}

		// No admin privs? No managing users.
		if (!isAdmin) {
			res.json(models.error("Permission denied"));
		}

		res.render("usermgr", templateVars);
	});
});

module.exports = router;
