/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia and Dove

	Please see LICENSE for more info
 */

/*

Expects five functions: { connect, select, run, getTransactStartSql, close }

- Make a connection to the database and call the callback with it (or an error object).
function connect(function(err, connection) {});

- Do a SQL select with the specified args (an array), and call the callback with an error
- object or with rows of data.
function select(connection, statement, args, function(err, rows) {});

- Do a SQL execute with the specified args (an array), and call the callback with an error
- object or with an ID of the last inserted row (if applicable).
function run(connection, statement, args, function(err, insertId) {});

- Returns a string that represents a transaction beginning statement.
- Really lame, guys. Lame.
function getTransactStartSql();

- Closes the database connection.
function close(connection);

*/

'use strict';

let sal;
let verbose = true;

function init(salIn) {
	sal = salIn;
}

// Returns a promise that evaluates to a database connection, ready for statements.
function connect() {
	return new Promise(function(success, fail) {
		sal.connect(function(err, conn) {
			//if (verbose)
			//	console.log("Connect -> (",err,",",conn,")");
			if (err)
				fail(err);
			else
				success(conn);
		});
	});
}

// Returns a promise that evaluates to a select operation on the database.
function select(conn, statement, args) {
	return new Promise(function(success, fail) {
		if (verbose)
			console.log("select: (",statement,",",args,")");
		sal.select(conn, statement, args, function(err, rows) {
			if (verbose)
				console.log("select results: (",err,",",rows,")");
			if (err)
				fail(err);
			else
				success(rows);
		});
	});
}

// Returns a promise that evaluates to a run operation on the database.
function run(conn, statement, args) {
	return new Promise(function(success, fail) {
		if (verbose)
			console.log("run: (",statement,",",args,")");
		sal.run(conn, statement, args, function(err, insertId) {
			if (verbose)
				console.log("run results: (",err,",",insertId,")");
			if (err)
				fail(err);
			else
				success(insertId);
		});
	});
}

// Returns a promise that evaluates to a run() operation wrapped in a transaction.
// If any of the promises fails, the whole transaction will be rolled back; otherwise
// it will be committed.
function transact(conn, statement, args) {
	return new Promise(function(success, fail) {
		if (verbose)
			console.log("transact: begin");

		run(conn, sal.getTransactStartSql(), []).then(function() {
			return run(conn, statement, args);
		}).then(function() {
			if (verbose)
				console.log("transact: commit");
			return run(conn, "commit", []);
		}).then(function() {
			success();
		}).catch(function(err) {
			if (verbose)
				console.log("transact: rollback");
			run(conn, "rollback", []).then(function() {
				fail(err);
			}).catch(function() {
				fail(err);
			});
		});
	});
}

function getTransactStartSql() {
	return sal.getTransactStartSql();
}

function close(conn) {
	sal.close(conn);
}

module.exports = {
	init: init,
	connect: connect,
	select: select,
	run: run,
	transact: transact,
	getTransactStartSql: getTransactStartSql,
	close: close
};
