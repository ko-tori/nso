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

var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var session = require("express-session");

var oppai = function (file, callback, err) {
    var child = childProcess.spawn(/^win/.test(process.platform) ? "./oppai/oppai-win.exe" : "./oppai/oppai", [file, "-ojson"]);
    child.stdout.on("data", function (data) {
        callback(JSON.parse(data));
    });
    child.stderr.on("data", function (data) {
        if (err) {
            err(data);
        } else {
            console.error("err:", data.toString());
        }
    });
    child.on("error", function (data) {
        if (err) {
            err(data);
        } else {
            console.error("err:", data.toString());
        }
    });
};

var Beatmap = require("./lib/Beatmap");
var Room = require("./lib/Room");
var Util = require("./lib/Util");
var User = require("./lib/User");
var common = require("./common");

var rooms = Room.all();
var randomString = Util.randomString;

try {
    fs.accessSync("uploads");
} catch (e) {
    fs.mkdirSync("uploads");
}

app.set("view engine", "ejs");
app.use(bodyParser());
app.use(cookieParser(process.env.SUPER_SECRET));
app.use(session({
    secret: process.env.SUPER_SECRET
}));

app.post("/", function (req, res, next) {
    if (!req.body.username || !req.body.password) {
        return res.redirect("/");
    }
    var username = req.body.username;
    var password = req.body.password;
    var user = User.getByUsername(username);
    if (user !== null) {
        if (!user.checkPassword(password)) {
            return res.redirect("/");
        }
    } else {
        // create user
        user = new User(username);
        user.setPassword(password);
        user.save();
    }
    var token = user.getLoginToken();
    res.cookie("token", token, { signed: true });
    res.redirect("/");
});

app.get("/", User.loginStatus, function (req, res, next) {
    res.render("index");
});

app.use(express.static("ext"));
app.use(express.static("nso"));

app.get("/f/:id*", function (req, res) {
    var room = Room.get(req.params.id);
    if (room === null) { res.sendStatus(404); }
    var file = `${__dirname}/uploads/${room.mapId + req.params[0]}`;
    fs.exists(file, function (exists) {
        if (!exists) {
            res.sendStatus(404);
        } else {
            //console.log("sending: " + file);
            res.sendFile(file);
        }
    });
});

app.get("/d/:id", function (req, res) {
    res.sendFile(__dirname + "/nso/index.html");
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

var create_room = function (roomID) {
    var url = "/d/" + roomID;
    var room = Room.get(roomID);
    var beatmap = room.beatmap;
    console.log("creating " + roomID);
    //console.log(beatmap);
    if (!(url in io.nsps)) {
        var nsp = io.of(url);
        console.log("created room: " + url);
        var clients = {};
        nsp.on('connection', function (socket) {
            console.log(socket.client.id + ' joined ' + url);

            socket.emit('hi', beatmap.json());

            socket.on('join', function (data) {
                for (var i in clients) {
                    if (clients.hasOwnProperty(i)) {
                        socket.emit('join', [i, clients[i]]);
                    }
                }
                socket.broadcast.emit('join', [socket.client.id, data]);
                clients[socket.client.id] = data;
            });

            socket.on('msg', function (data) {
                socket.broadcast.emit('msg', data);
            });

            socket.on('disconnect', function (data) {
                delete clients[socket.client.id];
                socket.broadcast.emit('leave', socket.client.id);
            });

            socket.on('edit move', function (data) {
                var obj = beatmap.matchObj(HitObject.parse(data[0]));
                if (obj) {
                    obj.position.x = data[1];
                    obj.position.y = data[2];
                } else {
                    //console.log('object not found!');
                }
                socket.broadcast.emit('edit move', data);
            });
        });
    }
    room.initialized = true;
};

for (var id in rooms) {
    var room = Room.get(id);
    if (room === null) continue;
    if (!room.initialized) {
        create_room(room.id);
    }
}

var get_room_list = function (user) {
    return Object.keys(Room.all()).map(function (id) {
        var room = Room.get(id);
        if (room instanceof Room) {
            return room.publicData();
        }
        return {};
    });
};

var lobby = io.of("/lobby");

var generate_osz = function (roomID) {

};

lobby.on("connection", function (socket) {
    socket.on("auth", function (token) {
        var user = User.getByToken(token);
        socket.emit("rooms", get_room_list(user));
    });
    socket.on("get url", function (data) {
        if (!fs.existsSync(path.join("uploads", data.map))) {
            return;
        }
        var difficulty = new Buffer(data.difficulty, "base64").toString("ascii");
        if (!fs.existsSync(path.join("uploads", data.map, difficulty))) {
            return;
        }
        var room = Room.newRoom(data.map, difficulty);
        room.save();
        // {
        // 	map: data.map,
        // 	difficulty: difficulty,
        // };

        var url = "/d/" + room.id;
        create_room(room.id);

        lobby.emit("rooms", get_room_list(user));
        socket.emit("redirect to", url);
    });
    var delivery = dl.listen(socket);
    delivery.on("receive.success", function (file) {
        var dirname = randomString();
        JSZip.loadAsync(file.buffer).then(function (zip) {
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
                    zip.file(files[i]).async("arraybuffer").then(function (content) {
                        var temppath = path.join(mapdir, files[i]);
                        temppath.split('\\').reduce(function (prev, curr, i) {
                            if (fs.existsSync(prev) === false) {
                                fs.mkdirSync(prev);
                            }
                            return prev + '\\' + curr;
                        });
                        fs.writeFile(path.join(mapdir, files[i]), new Buffer(content), function (err) {
                            if (err) console.log("Error while writing file: ", err);
                            if (files[i].toLowerCase().endsWith(".osu")) {
                                oppai(path.join(__dirname, mapdir, files[i]), function (data) {
                                    data.choice = new Buffer(files[i]).toString("base64");
                                    difficulties.push(data);
                                    next(i + 1);
                                }, function (err) {
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
server.listen(port, function () {
    console.log(`Running on port ${port}...`);
});
