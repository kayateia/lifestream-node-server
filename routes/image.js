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
var lscrypto = require("./../lib/lscrypto");
var security = require("./../lib/security");

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

		security.validateLogin(req, res, function(err, tokenContents) {
			if (err) {
				return res.json(models.error(err));
			}

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

			if (!(/^([A-Za-z0-9_-]+\.)+[A-Za-z]+$/.test(req.files[0].originalname))) {
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

			dbmod.imageAdd(tokenContents.id, [streamid], req.files[0].originalname, comment,
				function(err) {
					if (err)
						res.json(models.error("Error adding image", err));
					else {
						res.json(models.success());
					}
				}
			);
		});

	});
});

router.get("/get/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(models.error(err));
		}

		dbmod.imageGet(req.params.id, function(err, img) {
			if (err) {
				return res.json(models.error(err));
			}

			res.sendFile(process.cwd() + "/uploads/" + img.userid + "/" + img.fn);
		});
	});
});

module.exports = router;
