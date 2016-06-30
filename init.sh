#!/bin/bash
#
# This script initialises the config file and database. It must be run at
# least once. On this run, the environment variables MYSQL_ADMIN_USER and
# MYSQL_ADMIN_PASSWORD must be passed in to the container.
#
# If this script is re-run after initialisation has already happened, it will
# wipe and recreated the database, and remove all uploads.

if [ -z "$MYSQL_PORT_3306_TCP_ADDR" -o -z "$MYSQL_ADMIN_USER" -o -z "$MYSQL_ADMIN_PASSWORD" ]; then
	echo "The following environment variables must be set for this script to work:"
	echo "	MYSQL_PORT_3306_TCP_ADDR=<MySQL server IP address>"
	echo "	MYSQL_ADMIN_USER=<MySQL admin username>"
	echo "	MYSQL_ADMIN_PASSWORD=<MySQL admin password>"
	exit 1
fi

read -p "WARNING: Initialization will wipe and re-create the database, and delete all uploaded images. Type \"yes\" to confirm: " confirm
if [ "$confirm" != "yes" ]; then
	echo "Initialization aborted by user."
	exit 1
fi

user=`node config-reader.js mysqlUser`
password=`node config-reader.js mysqlPassword`
database=`node config-reader.js mysqlDatabase`

mysql_query() {
	local query="$1"
	mysql -h $MYSQL_PORT_3306_TCP_ADDR -u "$MYSQL_ADMIN_USER" --password="$MYSQL_ADMIN_PASSWORD" -e "$query"
}

mysql_source() {
	local database="$1"
	local sqlfile="$2"
	mysql -h $MYSQL_PORT_3306_TCP_ADDR -u "$MYSQL_ADMIN_USER" --password="$MYSQL_ADMIN_PASSWORD" "$database" <"$sqlfile"
}

mysql_query "CREATE DATABASE IF NOT EXISTS $database"
mysql_query "GRANT ALL ON $database.* TO '$user' IDENTIFIED BY '$password'"
mysql_source "$database" "notes/mysql-schema.sql"

rm -rf uploads/*
