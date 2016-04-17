/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

function success() {
	 return { success: true };
}

function error(msg, detail) {
	if (typeof msg !== "string")
		throw "Invalid type in error()";
	return { success: false, error: msg, detail: detail };
}

function loginResponse(token) {
	if (typeof token !== "string")
		throw "Invalid type in loginResponse()";
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

// A row from the user table in the database.
function userInfo(row) {
	if (typeof(row) !== "object") {
		throw "Invalid type in userInfo()";
	}

	return {
		id: row.rowid,
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
	userInfo: userInfo
};
