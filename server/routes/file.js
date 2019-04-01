var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');

var Room = require("../db/rooms");

router.get("/:id*", function (req, res) {
    var room = Room.get(req.params.id);
    if (!room) { res.sendStatus(404); }
    var file = path.resolve(`${__dirname}/../../uploads/${room.mapId + req.params[0]}`);
    fs.exists(file, function (exists) {
        if (!exists) {
            res.sendStatus(404);
        } else {
            res.sendFile(file);
        }
    });
});

module.exports = router;