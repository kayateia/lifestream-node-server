// This is just a stub. Still need to make this useful for sal.

var pool = null;

// Executes a database statement on a pooled connection. All commands executed
// on the connection are not guaranteed to run instantly, but are guaranteed to run
// sequentially and serially.
function dbExec(innards) {
	if (!pool) {
		pool = mysql.createPool({
			connectionLimit: 10,
			host: config.mysqlHost,
			user: config.mysqlUser,
			password: config.mysqlPassword,
			database: config.mysqlDatabase,
			multipleStatements: true
		});
	}

	pool.getConnection(function(err, connection) {
		if (err) {
			innards(err);
		} else {
			innards(null, connection);
		}
	});
}

// Creates a function that closes any open database connection, then
// wraps any error in an error model and calls the callback as needed.
function errorWrapper(db, callback) {
	return function(err, results) {
		if (db)
			db.release();

		callback(err, results);
	};
}

// Creates a function that takes any thrown error value and wraps it in an
// error model before calling the callback.
function modelWrapper(message, errorWrapper) {
	return function(err, results) {
		if (err)
			errorWrapper(models.error(message, err));
		else
			errorWrapper(null, results);
	}
}

// Initialize the database if it's not already been initialized. Callback is
// a standard err function.
function dbInit(callback) {
	dbExec(function(err, db) {
		var cb = errorWrapper(db, callback);
		if (err)
			return cb(models.error("Can't open database", err));

		db.query("select * from meta", function(err, results) {
			if (err)
				return cb(err);

			if (results && results.length) {
				// The database was already initialized.
				return cb();
			}

			// We need to initialize some values in the tables. This assumes the tables
			// were already created earlier.
			db.query("start transaction;"
					+ "insert into meta(token, value) values ('version', '1');"
					+ "insert into user(login, pwhash, name, isadmin) values (?, ?, 'Admin', 1);"
					+ "select @id := last_insert_id();"
					+ "insert into stream(userid, name, permission) values (@id, 'Global Stream', ?);"
					+ "insert into subscription(userid, streamid) values (@id, last_insert_id());"
					+ "commit;",
					[ config.adminLogin, lscrypto.hash(config.adminPassword), PERM_PUBLIC ],
					modelWrapper("Can't initialise database", cb));
		});
	});
}
