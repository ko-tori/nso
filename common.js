var low = require("lowdb");
var storage = require("lowdb/lib/file-sync");

var db = low("db.json", {
    storage: storage
});

db.defaults({
    rooms: {},
    users: [],
    loginTokens: [],
}).value();

exports.db = db;