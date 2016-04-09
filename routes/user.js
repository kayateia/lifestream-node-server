/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var express = require("express");
var router = express.Router();
var dbmod = require("./../lib/db");
var crypto = require("./../lib/crypto");
var models = require("./../lib/models");

// Add a user
router.post("/create", function(req, res, next) {
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
	console.log("Would create with hash",crypto.encrypt(pwd));

	var db = dbmod.get();

	var stmt = db.prepare("insert into user(login, pwhash, name) values (?,?,?)");
	stmt.run(login, pwd, name);
	stmt.finalize();

	db.each("select rowid as id, login, name, pwhash from user", function(err, row) {
		console.log(row.id, row.login, row.name, row.pwhash);
	});

	db.close();
	
	return res.json(models.success());
});

module.exports = router;
