module.exports = (app, io) => {

var express = require('express');
var router = express.Router();
var passport = require('passport');
var fs = require("fs");
var JSZip = require("jszip");
var bcrypt = require('bcrypt-nodejs');
var formidable = require('formidable');
var path = require('path');
var oppai = require('../oppai');

var r = require('rethinkdb');
var connection;

r.connect({ host: 'localhost', port: 28015 }, function(err, conn) {
    if (err) throw err;
    connection = conn;
})

var Beatmap = require("../../lib/Beatmap");
var Room = require("../../lib/Room");
var Util = require("../../lib/Util");

var rooms = Room.all();
var randomString = Util.randomString;

try {
    fs.accessSync("uploads");
} catch (e) {
    fs.mkdirSync("uploads");
}

try {
    fs.accessSync("tempuploads");
} catch (e) {
    fs.mkdirSync("tempuploads");
}

var create_room = function (roomID) {
    var url = "/d/" + roomID;
    var room = Room.get(roomID);
    var beatmap = room.beatmap;
    console.log("creating " + roomID, "mapID: " + room.mapId);
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

var get_room_list = function () {
    return Object.keys(Room.all()).map(function (id) {
        var room = Room.get(id);
        if (room instanceof Room) {
            return room.publicData();
        }
        return {};
    });
};

router.get('/', function(req, res) {
    res.render('index', { user: req.user });
});

router.get('/register', function(req, res) {
    res.render('register', { error: undefined });
});

router.post('/register', function(req, res, next) {
	r.db('nso').table('users').filter(r.row('username').eq(req.body.username)).run(connection, function(err, u) {
		if (err) {
        console.log('error retrieving users...');
        return;
      }
        u.toArray((err, users) => {
            if (err || users.length < 1) {
            	r.db('nso').table('users').insert({
			        username: req.body.username.trim(),
			        password: bcrypt.hashSync(req.body.password.trim()),
			    }).run(connection, function(err, result) {
			        if (err) {
			            res.render('register', { error: err.message });
			        }
			        console.log('Created user ' + req.body.username.trim());
			        passport.authenticate('local')(req, res, function() {
			            req.session.save(function(err) {
			                if (err) {
			                    return next(err);
			                }
			                res.redirect('/');
			            });
			        });
			    });
            } else
            	res.render('register', { error: "User already exists!" });
        });
    });  
});

router.get('/users', function(req, res) {
	r.db('nso').table('users').filter(r.row('username')).run(connection, function(err, u) {
        u.toArray((err, users) => {
        	res.send(users.map(x => x.username).join('\n'));
        });
    });
});

router.get('/resetusers', function(req, res) {
	r.db('nso').table('users').delete().run(connection);
	res.send('all users deleted');
});

router.get('/login', function(req, res) {
    if (req.user) res.redirect('/');
    else res.render('login', { user: req.user, error: req.query.err });
});

router.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.render('login', { error: "Login Failed." });
        }
        req.logIn(user, function(err) {
            if (err) { return next(err); }
            return res.redirect('/');
        });
    })(req, res, next);
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/profile', function(req, res) {
    if (!req.query.u) {
        if (!req.user) res.render('profilesearch', { user: req.user });
        else {
            res.redirect(`profile?u=${req.user.username}`);
        }
    } else {
        r.db('nso').table('users').filter(r.row('username').eq(req.query.u)).run(connection, function(err, u) {
            u.toArray((err, users) => {
                if (err || users.length < 1) res.render('profile', { user: req.user, u: undefined });
                else {
                    u = users[0];

                    res.render('profile', { user: req.user, u: u });
                }
            });
        });
    }
});

var lobby = io.of("/lobby");

lobby.on("connection", function (socket) {
    socket.emit("rooms", get_room_list());
    socket.on("get url", function (data) {
    	console.log(data.map);
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

        lobby.emit("rooms", get_room_list());
        socket.emit("redirect to", url);
    });
    router.post('/', function(req, res) {
    	var form = new formidable.IncomingForm();
    	form.parse(req);

    	form.on('fileBegin', function(name, file) {
			file.path = __dirname + '/../../tempuploads/' + file.name;
		});

		form.on('file', function(name, file) {
			fs.readFile(file.path, (err, data) => {
				var dirname = randomString();
				JSZip.loadAsync(data).then(function (zip) {
		            var mapdir = path.join(__dirname, "/../../uploads", dirname);
		            while (fs.existsSync(mapdir)) {
		                dirname = randomString();
		                mapdir = path.join(__dirname, "../../uploads", dirname);
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
		                                oppai(path.join(mapdir, files[i]), function (data) {
		                                    difficulties.push({
		                                    	choice: new Buffer(files[i]).toString("base64"),
		                                    	name: data.version,
		                                    	stars: data.stars
		                                    });
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
		                	res.json({
		                        "map": dirname,
		                        "difficulties": difficulties
		                    });
		                }
		            })(0);
		        });
			});
			
		});
    });
});

return router;

};