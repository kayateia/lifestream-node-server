/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var express = require("express");
var router = express.Router();
var multer = require("multer");

var dbmod = require("./../lib/db");

/*var storage = multer.diskStorage({
	destination: function(req, file, callback) {
		callback(null, "./uploads");
	},
	filename: function(req, file, callback) {
		callback(null, file.fieldname + "-" + Date.now());
	}
});
var upload = multer({ storage: storage }).single("userPhoto"); */

var storage = multer.memoryStorage();
var upload = multer({ storage: storage }).any();

/* GET users listing. */
router.post("/:token", function(req, res, next) {
	console.log("token", req.params.token);

	upload(req, res, function(err) {
		if (err) {
			console.log("error is",err);
			return res.end("error uploading"+err);
		}
		console.log(req.files);
		res.end("file is uploaded");
	});
});

module.exports = router;
