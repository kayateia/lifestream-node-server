/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	Please see LICENSE for more info
 */

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var config = require("./config");
var routes = require('./routes/index');
var stream = require('./routes/stream');
var image = require("./routes/image");
var user = require("./routes/user");
var invite = require("./routes/invite");
var subscription = require("./routes/subscription");

var sal = require("./lib/sal");
var dbDriver = require("./lib/drivers/" + config.databaseDriver);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/stream', stream);
app.use("/api/image", image);
app.use("/api/user", user);
app.use("/api/invite", invite);
app.use("/api/subscription", subscription);

// Also accept non-API routes if Web client is enabled in config
if (config.webClient === true) {
	app.use('/', routes);
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// Set up database
sal.init(dbDriver);

// error handlers

// development error handler
// will print stacktrace
//if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			webClient: config.webClient,
			isAdmin: false,
			userid: null,
			userLogin: null,
			message: err.message,
			error: err,
			title: "LifeStream error"
		});
		console.log(err);
	});
//}

// production error handler
// no stacktraces leaked to user
/*app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
}); */


module.exports = app;
