/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var express = require("express");
var router = express.Router();
var multer = require("multer");
var fs = require("fs");

var dbmod = require("./../lib/db");
var models = require("./../lib/models");
var lscrypto = require("./../lib/crypto");

/*var storage = multer.diskStorage({
	destination: function(req, file, callback) {
		callback(null, "./uploads");
	},
	filename: function(req, file, callback) {
		callback(null, file.fieldname + "-" + Date.now());
	}
});*/

var storage = multer.memoryStorage();

// var upload = multer({ storage: storage }).single("userPhoto");
var upload = multer({ storage: storage }).any();

// Upload an image to the server.
// Required: token, streamid, a file.
// Optional: comment
router.post("/post", function(req, res, next) {
	upload(req, res, function(err) {
		if (err) {
			console.log("error is",err);
			return res.end("error uploading"+err);
		}

		var token = req.body.token;
		if (!token)
			return res.json(models.error("Missing 'token'"));

		var tokenContents = lscrypto.validateToken(token);
		if (!tokenContents)
			return res.json(models.error("Token is invalid"));

		var streamid = req.body.streamid;
		if (!streamid)
			return res.json(models.error("Missing 'streamid'"));

		// This one is optional.
		var comment = req.body.comment;
		if (!comment)
			comment = "";

		if (!req.files || req.files.length != 1)
			return res.json(models.error("Must be exactly one file present"));

		console.log(req.files);

		if (!(/^[A-Za-z0-9_-]+\.[A-Za-z]+$/.test(req.files[0].originalname))) {
			return res.json(models.error("File name was invalid"));
		}

		try {
			fs.accessSync("./uploads", fs.F_OK);
		} catch (e) {
			fs.mkdirSync("./uploads");
		}

		var uploadPath = "./uploads/" + tokenContents.id;
		try {
			fs.accessSync(uploadPath, fs.F_OK);
		} catch (e) {
			fs.mkdirSync(uploadPath);
		}

		fs.writeFileSync("./uploads/" + tokenContents.id + "/" + req.files[0].originalname,
			req.files[0].buffer);

		dbmod.imageAdd(tokenContents.id, streamid, req.files[0].originalname, comment, function() {});

		return res.json(models.success());
	});
});

router.post("/get/:id", function(req, res, next) {
	var token = req.body.token;
	if (!token)
		return res.json(models.error("Missing 'token'"));

	var tokenContents = lscrypto.validateToken(token);
	if (!tokenContents)
		return res.json(models.error("Token is invalid"));

	dbmod.imageGet(req.params.id, function(img, err) {
		if (err)
			return res.json(models.error(err));

		res.sendFile(process.cwd() + "/uploads/" + img.userid + "/" + img.fn);
	});
});

module.exports = router;
