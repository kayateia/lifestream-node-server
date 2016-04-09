/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var express = require("express");
var router = express.Router();
var dbmod = require("./../lib/db");

/* GET users listing. */
router.get("/:id", function(req, res, next) {
	console.log("db is",dbmod);
	var db = dbmod.get();	
	db.close();

	var result = [];
	for (var i = 0; i < req.params.id; ++i)
		result.push({test: 'foo', bar: 'baz'});
	res.json(result);
});

module.exports = router;
