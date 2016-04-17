/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var express = require("express");
var router = express.Router();
var lscrypto = require("./../lib/lscrypto");
var security = require("./../lib/security");

/* GET home page. */
router.get("/", function(req, res, next) {
	res.render("index", {
		title: "LifeStream"
	});
});
router.get("/login", function(req, res, next) {
	var templateVars = {
		message: null,
		title: "LifeStream - Sign in"
	};

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

		// Redirect user to the URL they were trying to access before they
		// were redirected to the login page.
		if (req.query.from) {
			templateVars.fromUrl = req.query.from;
		}
	}

	res.render("login", templateVars);
});
router.get("/usermgr", function(req, res, next) {
	res.render("usermgr", {
		title: "LifeStream - User manager"
	});
});
router.get("/test", function(req, res, next) {
	res.cookie("authorization", "Bearer " + security.makeToken(2, "deciare", lscrypto.hash("pass")));
	res.render("index", { title: "LifeStream" });
});

module.exports = router;
