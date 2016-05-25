/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

function logTypeError(name, error) {
	var type = typeof error;

	if (type == "object") {
		console.log(name + ": [" + type + "] " + JSON.stringify(error));
	}
	else {
		console.log(name + ": [" + type + "] " + error);
	}
 }

function success() {
	 return { success: true };
}

function error(msg, detail) {
	if (typeof msg !== "string") {
		logTypeError("msg", msg);
		logTypeError("detail", detail);
		throw "Invalid type in error()";
	}
	console.log("error: \"" + msg + "\", detail: \"" + detail + "\"")
	return { success: false, error: msg, detail: detail };
}

function loginResponse(token) {
	if (typeof token !== "string") {
		logtypeError("token", token);
		throw "Invalid type in loginResponse()";
	}
	return { success: true, token: token };
}

// All values besides comment must be passed.
function image(id, filename, userLogin, uploadTime, comment) {
	if (!id || !filename || !userLogin || !uploadTime)
		throw "Missing value in image()";
	if (!comment)
		comment = "";
	if (typeof id !== "number" || typeof filename !== "string"
		|| typeof userLogin !== "string" || typeof uploadTime !== "number"
		|| typeof comment !== "string")
		throw "Invalid type in image()";
	return {
		success: true,
		id: id,
		filename: filename,
		userLogin: userLogin,
		uploadTime: uploadTime,
		comment: comment
	};
}

// Each row should be an image object.
function streamContents(rows) {
	 return { success: true, images: rows };
}

// Each row should be an invite object.
function streamList(rows) {
	return { success: true, streams: rows };
}

// A row from the user table in the database.
function userInfo(row) {
	if (typeof row !== "object") {
		logTypeError("row", row);
		throw "Invalid type in userInfo()";
	}

	return {
		success: true,
		id: row.id,
		login: row.login,
		name: row.name,
		email: row.email,
		isadmin: row.isadmin
	};
}

module.exports = {
	success: success,
	error: error,
	loginResponse: loginResponse,
	image: image,
	streamContents: streamContents,
	streamList: streamList,
	userInfo: userInfo
};
