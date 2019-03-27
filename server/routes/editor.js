module.exports = (app, io) => {

var express = require('express');
var router = express.Router();
var path = require('path');

var Room = require("../../lib/Room");
var rooms = Room.all();

router.get("/:id", function (req, res) {
	var p = path.join(__dirname + "/../../static/editor.html");
	console.log(p);
    res.sendFile(p);
    if (!rooms.hasOwnProperty(req.params.id)) {
        var nsp = io.of(req.originalUrl);
        nsp.on('connection', function (socket) {
            socket.emit('badurl', '');

            socket.on('disconnect', function () {
                if (Object.keys(nsp.connected).length === 0) {
                    delete io.nsps[nsp.name];
                }
            });
        });
    }
});

return router;

};