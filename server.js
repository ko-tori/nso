var express = require("express");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var parser = require("osu-parser");
var fs = require("fs");
var path = require("path");
var dl = require("delivery");
var JSZip = require("jszip");
var childProcess = require("child_process");

var oppai = function(file, callback) {
	var child = childProcess.spawn("./oppai/oppai", [file, "-ojson"]);
	child.stdout.on("data", function(data) {
		callback(JSON.parse(data));
	});
	child.stderr.on("data", function(data) {
		console.error("stderr:", data.toString());
	});
	child.on("error", function(data) {
		console.error("err:", data.toString());
	});
}

var Beatmap = require("./lib/Beatmap");

var rooms = {};

function randomString(length, chars) {
	length = length || 32;
	chars = chars || "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var result = "";
	for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
	return result;
}

try {
	fs.accessSync("uploads");
} catch (e) {
	fs.mkdirSync("uploads");
}

app.get("/", function(req, res) {
	res.sendfile("nso/landing.html");
});

app.use(express.static("ext"));
app.use(express.static("nso"));

app.get("/d/:id", function(req, res) {
	res.sendfile("nso/index.html");
});

var get_room_list = function() {
	return Object.keys(rooms).map(function(roomID) {
		var room = rooms[roomID];
		room["url"] = "/d/" + roomID;
		return room;
	});
};

var lobby = io.of("/");

lobby.on("connection", function(socket) {
	socket.emit("rooms", get_room_list());
	socket.on("get url", function(data) {
		if (!fs.existsSync(path.join("uploads", data.map))) {
			return;
		}
		var difficulty = new Buffer(data.difficulty, "base64").toString("ascii");
		if (!fs.existsSync(path.join("uploads", data.map, difficulty))) {
			return;
		}
		var room = randomString();
		rooms[room] = {
			map: data.map,
			difficulty: difficulty
		};
		var url = "/d/" + room;
		lobby.emit("rooms", get_room_list());
		socket.emit("redirect to", url);
	});
	var delivery = dl.listen(socket);
	delivery.on("receive.success", function(file) {
		JSZip.loadAsync(file.buffer).then(function(zip) {
			var dirname = randomString(), mapdir = path.join("uploads", dirname);
			while (fs.existsSync(mapdir)) {
				dirname = randomString();
				mapdir = path.join("uploads", dirname);
			}
			fs.mkdirSync(mapdir);
			console.log(mapdir);
			var files = Object.keys(zip.files);
			var difficulties = [];
			(function next(i) {
				if (i < files.length) {
					zip.file(files[i]).async("arraybuffer").then(function(content) {
						fs.writeFile(path.join(mapdir, files[i]), new Buffer(content), function(err) {
							if (err) console.log(err);
							if (files[i].toLowerCase().endsWith(".osu")) {
								oppai(path.join(__dirname, mapdir, files[i]), function(data) {
									data["choice"] = new Buffer(files[i]).toString("base64");
									difficulties.push(data);
									next(i + 1);
								});
							} else {
								next(i + 1);
							}
						});
					});
				} else {
					socket.emit("choose diff", {
						"map": dirname,
						"difficulties": difficulties
					});
				}
			})(0);
		});
	});
});

var port = process.env.PORT || 3000;
server.listen(port, function() {
	console.log(`Running on port ${port}...`);
});