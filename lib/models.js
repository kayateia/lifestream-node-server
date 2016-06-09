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

function insertSuccess(id) {
	return { success: true, id: id };
}

function error(msg, detail) {
	if (typeof msg !== "string") {
		logTypeError("msg", msg);
		logTypeError("detail", detail);
		throw "Invalid type in error()";
	}
	console.log("error: \"", msg, "\", detail: \"", detail, "\"")
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
function image(id, filename, userLogin, userName, uploadTime, comment) {
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
		userName: userName,
		uploadTime: uploadTime,
		comment: comment
	};
}

// id: numeric ID of image
// streams: each row of array should be a stream object
function imageStreamList(id, streams) {
	return { success: true, id: id, streams: streams };
}

// Each row should be an image object.
function streamContents(rows) {
	 return { success: true, images: rows };
}

// Row sould be a stream object
function streamInfo(row) {
	return {
		success: true,
		id: row.id,
		userid: row.userid,
		name: row.name,
		permission: row.permission,
		userLogin: row.userLogin,
		userName: row.userName
	};
}

// Each row should be a stream object.
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

// Each row should be a stream object.
function userList(rows) {
	return { success: true, users: rows };
}

// Each row should be an invite object.
function inviteList(rows) {
	return { success: true, invites: rows };
}

// Each row should be an invite request object.
function inviteRequestList(rows) {
	return { success: true, requests: rows };
}

// Each row should be a subscription object.
function subscriptionList(rows) {
	return { success: true, subscriptions: rows };
}

// Each row should be an object consisting of streamid, userid, and state
function subscriptionStates(rows) {
	return { success: true, states: rows };
}

module.exports = {
	success: success,
	insertSuccess: insertSuccess,
	error: error,
	loginResponse: loginResponse,
	image: image,
	imageStreamList: imageStreamList,
	streamContents: streamContents,
	streamInfo: streamInfo,
	streamList: streamList,
	userInfo: userInfo,
	userList: userList,
	inviteList: inviteList,
	inviteRequestList: inviteRequestList,
	subscriptionList: subscriptionList,
	subscriptionStates: subscriptionStates,
};
