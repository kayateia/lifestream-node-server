drop table if exists device;
drop table if exists subscription;
drop table if exists streamimage;
drop table if exists stream;
drop table if exists image;
drop table if exists user;
drop table if exists meta;

create table meta (
	id integer auto_increment primary key,
	token varchar(255),
	value text);
--insert into meta(token, value) values ('version', '1');

create table user (
	id integer auto_increment primary key,
	login varchar(64),
	pwhash varchar(64),
	name varchar(64),
	email varchar(64),
	enabled tinyint,
	isadmin tinyint);
--insert into user(login, pwhash, name, isadmin) values ('admin', 'passwordHash', 'Admin User', 1);
-- To obtain password hash, run the following JS in project root directory:
--
-- var config = require("./config");
-- var lscrypto = require("./lib/lscrypto");
-- console.log(lscrypto.hash(config.adminPassword));

create table device (
	id integer auto_increment primary key,
	deviceid text,
	servicetype tinyint,
	pushtoken text,
	userid int,
	constraint foreign key(userid) references user(id));

create table image (
	id integer auto_increment primary key,
	fn varchar(255),
	userid int,
	uploadtime int,
	comment text,
	constraint foreign key(userid) references user(id));

create table stream (
	id integer auto_increment primary key,
	userid int,
	name varchar(255),
	permission tinyint,
	constraint foreign key(userid) references user(id));
--insert into stream(userid, name, permission) values (1, 'Global Stream', 1);

create table streamimage (
	imageid int,
	streamid int,
	constraint foreign key(imageid) references image(id),
	constraint foreign key(streamid) references stream(id));

create table subscription (
	userid int,
	streamid int,
	state tinyint,
	constraint foreign key(userid) references user(id),
	constraint foreign key(streamid) references stream(id));
--insert into subscription(userid, streamid) values (1, 1);
