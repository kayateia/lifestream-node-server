module.exports = {
	// Shared secret for auth token encryption
	tokenPassword: "thisisapassword!",

	// Google GCM API key
	googleApiKey: "",

	// Default admin user login
	adminLogin: "admin",

	// Default admin user password
	adminPassword: "admin",

	// Enable the built-in Web client?
	webClient: true,

	// Supported database drivers:
	//   - mysql (recommended)
	//   - sqlite
	databaseDriver: "mysql",

	// MySQL connection information, if needed.
	mysqlHost: "localhost",
	mysqlUser: "username",
	mysqlPassword: "password",
	mysqlDatabase: "lifestream"
};
