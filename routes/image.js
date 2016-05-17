/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var express = require("express");
var router = express.Router();
var multer = require("multer");
var fs = require("fs");
var gm = require("gm");
var path = require("path");
var sizeOf = require("image-size");

var dbmod = require("./../lib/db");
var models = require("./../lib/models");
var lscrypto = require("./../lib/lscrypto");
var security = require("./../lib/security");
var device = require("./../lib/device");

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
			return res.json(models.error("Error uploading", err));
		}

		security.validateLogin(req, res, function(err, tokenContents) {
			if (err) {
				return res.json(err);
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

			if (!(/^([A-Za-z0-9_-\s]+\.)+[A-Za-z]+$/.test(req.files[0].originalname))) {
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
						res.json(err);
					else {
						// Notify the appropriate push services of new messages available.
						device.notify([streamid], function(err) {
							res.json(models.success());
						});
					}
				}
			);
		});

	});
});

router.get("/get/:id", function(req, res, next) {
	security.validateLogin(req, res, function(err, tokenContents) {
		if (err) {
			return res.json(err);
		}

		dbmod.imageGet(req.params.id, function(err, img) {
			if (err) {
				return res.json(err);
			}

			var imageFile = "./uploads/" + img.userid + "/" + img.fn;

			// If original image is smaller than requested size, or no
			// specific size was requested, send original file.
			var sendOriginalFile = function() {
				res.sendFile(imageFile, { root: process.cwd() });
			}

			// If specific image size was requested, resize before sending
			if (req.query.scaleTo) {
				var imageSize = sizeOf(imageFile);

				// Image is resized asynchronously; send buffer as result
				var sendFromBuffer = function(err, buffer) {
					if (err) {
						res.json(err);
					}
					res.set("Content-Type", "image/" + path.extname(imageFile).substring(1));
					res.send(buffer);
				}

				// Determine which of hte image's dimensions are larger.
				if (imageSize.width >= imageSize.height) {
					imageSize.largerDimension = "width";
					imageSize.lesserDimension = "height";
				}
				else {
					imageSize.largerDimension = "height";
					imageSize.lesserDimension = "width";
				}

				switch (req.query.scaleMode) {
					case "cover":
						if (imageSize[imageSize.lesserDimension] > req.query.scaleTo) {
							// Scale the image's smaller dimension to match
							// the target size.
							if (imageSize.lesserDimension == "width") {
								gm(imageFile)
									.resize(req.query.scaleTo, null)
									.toBuffer(null, sendFromBuffer);
							}
							else {
								gm(imageFile)
									.resize(null, req.query.scaleTo)
									.toBuffer(null, sendFromBuffer);
							}
						}
						else {
							sendOriginalFile();
						}
						break;
					case "contain":
					default:
						if (imageSize[imageSize.largerDimension] > req.query.scaleTo) {
							// Scale the image's larger dimension to match
							// the target size.
							if (imageSize.largerDimension == "width") {
								gm(imageFile)
									.resize(req.query.scaleTo, null)
									.toBuffer(null, sendFromBuffer);
							}
							else {
								gm(imageFile)
									.resize(null, req.query.scaleTo)
									.toBuffer(null, sendFromBuffer);
							}
						}
						else {
							sendOriginalFile();
						}
				}
			}
			else {
				sendOriginalFile();
			}
		});
	});
});

module.exports = router;
