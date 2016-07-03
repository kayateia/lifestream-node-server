# LifeStream - Instant Photo Sharing ... in NodeJS

Copyright &copy; 2016 Kayateia and Deciare

## What is this?

**LifeStream** is a photo sharing service intended to be used in conjunction with a mobile client. The reference mobile client implementation is [LifeSharp](https://github.com/kayateia/lifesharp).

**lifestream-node-server** implements a RESTful API with which clients interact in order to make use of the service. It also bundles a Web client that implements the API.

## Installation

Make a copy of `config.template.js` and modify it to suit your environment.
```bash
cp config.template.js config.js
```

Install dependencies from npm and bower.
```bash
npm install -g bower
npm install
bower install
```

You may also need to install **GraphicsMagick** on your host operating system if images don't appear in the gallery.

## Usage

To start the server, run:
```bash
node bin/www
```

For development, it is recommended to use [nodemon](https://www.npmjs.com/package/nodemon) to automatically restart the server when code changes are made.
```bash
npm install -g nodemon
nodemon
```

For production, it is recommended to use [forever](https://www.npmjs.com/package/forever) to immediately restart the server if it goes down.
```bash
npm install -g forever
forever -w --watchDirectory . --watchIgnore 'uploads/*' bin/www
```

## Database

By default, **lifestream-node-server** expects to connect to a **MySQL** database, and configuration options for that connection are in `config.js`.

There is an option to use **SQLite** instead, which may be simpler for development purposes. Due to concurrency issues, doing so is _not recommended_ for production use.

To enable SQLite, you'll need to edit `app.js`. Change the following line:
```javascript
sal.init(mysql);
```
To:
```javascript
sal.init(sqlite);
```

## Dependencies

- npm
	- [body-parser](https://www.npmjs.com/package/body-parser)
	- [cookie-parser](https://www.npmjs.com/package/cookie-parser)
	- [ejs](https://www.npmjs.com/package/ejs)
	- [express](https://www.npmjs.com/package/express)
	- [gm](https://www.npmjs.com/package/gm)
	- [image-size](https://www.npmjs.com/package/image-size)
	- [multer](https://www.npmjs.com/package/multer)
	- [mysql](https://www.npmjs.com/package/mysql)
	- [request](https://www.npmjs.com/package/request)
	- [serve-favicon](https://www.npmjs.com/package/serve-favicon)
	- [sqlite3](https://www.npmjs.com/package/sqlite3)
	- [watt](https://www.npmjs.com/package/watt)
- bower
	- [angular](https://www.angularjs.org/)
	- [angular-bootstrap](https://angular-ui.github.io/bootstrap/)
	- [angular-bootstrap-lightbox](https://github.com/compact/angular-bootstrap-lightbox)
	- [angular-inview](https://github.com/thenikso/angular-inview)
	- [angular-animate](https://github.com/angular/bower-angular-animate)
	- [angular-cookies](https://github.com/angular/bower-angular-cookies)
	- [angular-route](https://github.com/angular/bower-angular-route)
	- [jquery](https://jquery.com/)
	- [bootstrap](https://getbootstrap.com/)
	- [ng-file-uload](https://github.com/danialfarid/ng-file-upload)


## Licence

[GPLv3](https://raw.githubusercontent.com/kayateia/lifestream-node-server/master/LICENSE)
