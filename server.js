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
	var child = childProcess.spawn(/^win/.test(process.platform) ? "./oppai/oppai-win.exe" : "./oppai/oppai", [file, "-ojson"]);
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

try {
	fs.accessSync("oszcache");
} catch (e) {
	fs.mkdirSync("oszcache");
}

app.get("/", function(req, res) {
	res.sendFile(__dirname + "/nso/landing.html");
});

app.use(express.static("ext"));
app.use(express.static("nso"));

app.get("/d/:id", function(req, res) {
	res.sendFile(__dirname + "/nso/index.html");
	if (!rooms.hasOwnProperty(req.params.id)) {

	}
});

var create_room = function(roomID) {
	var url = "/d/" + roomID;
	var room = rooms[roomID];
	Beatmap.ParseFile(`uploads/${room.map}/${room.difficulty}`, function(beatmap) {
		//console.log(beatmap);
		if (!(url in io.nsps)) {
			var nsp = io.of(url);
			console.log("created room: " + url);
			var clients = {};
			nsp.on('connection', function(socket) {
				console.log(socket.client.id + ' joined ' + url);

				socket.emit('hi', { difficulty: room.difficulty });

				socket.on('join', function(data) {
					for (var i in clients) {
						if (clients.hasOwnProperty(i)) {
							socket.emit('join', [i, clients[i]]);
						}
					}
					socket.broadcast.emit('join', [socket.client.id, data]);
					clients[socket.client.id] = data;
				});

				socket.on('msg', function(data) {
					socket.broadcast.emit('msg', data);
				});

				socket.on('disconnect', function(data) {
					delete clients[socket.client.id];
					socket.broadcast.emit('leave', socket.client.id);
				});

				var delivery = dl.listen(socket);
				delivery.on('delivery.connect', function(dlinstance) {

					function send() {
						dlinstance.send({
							name: room.map + '.osz',
							path: path.join('oszcache', room.map)
						});
					}

					socket.on('osz', send);

					send();

					// dlinstance.on('send.start', function(filePackage) {
					// 	console.log("File is being sent to the client.");
					// });

					// dlinstance.on('send.success', function(file) {
					// 	console.log('File successfully sent to client!');
					// });

				});

				socket.on('edit move', function(data) {
					console.log(data);
					var obj = beatmap.matchObj(HitObject.parse(data[0]));
					if(obj) {
						obj.position.x = data[1];
						obj.position.y = data[2];
					}
					else {
						//console.log('object not found!');
					}
					socket.broadcast.emit('edit move', data);
				});
			});
		}
	});
};

var get_room_list = function() {
	return Object.keys(rooms).map(function(roomID) {
		return {
			url: "/d/" + roomID,
			difficulty: rooms[roomID].difficulty.replace(".osu", "")
		};
	});
};

var lobby = io.of("/lobby");

var generate_osz = function(roomID) {

};

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
		while (room in rooms) {
			room = randomString();
		}

		rooms[room] = {
			map: data.map,
			difficulty: difficulty,
		};

		var url = "/d/" + room;
		create_room(room);

		lobby.emit("rooms", get_room_list());
		socket.emit("redirect to", url);
	});
	var delivery = dl.listen(socket);
	delivery.on("receive.success", function(file) {
		var dirname = randomString();
		fs.writeFile(path.join('oszcache', dirname), file.buffer);
		JSZip.loadAsync(file.buffer).then(function(zip) {
			var mapdir = path.join("uploads", dirname);
			while (fs.existsSync(mapdir)) {
				dirname = randomString();
				mapdir = path.join("uploads", dirname);
			}
			fs.mkdirSync(mapdir);
			var files = Object.keys(zip.files);
			var difficulties = [];
			(function next(i) {
				if (i < files.length) {
					zip.file(files[i]).async("arraybuffer").then(function(content) {
						var temppath = path.join(mapdir, files[i]);
						temppath.split('\\').reduce(function(prev, curr, i) {
							if (fs.existsSync(prev) === false) {
								fs.mkdirSync(prev);
							}
							return prev + '\\' + curr;
						});
						fs.writeFile(path.join(mapdir, files[i]), new Buffer(content), function(err) {
							if (err) console.log("Error while writing file: ", err);
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
