// Simple helper script that reads config.js and prints the requested
// configuration parameter onto stdout.

var config = require("./config");
console.log(config[process.argv[2]]);
