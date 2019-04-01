module.exports = (app, io) => {

var express = require('express');
var router = express.Router();
var fs = require("fs");
var JSZip = require("jszip");
var formidable = require('formidable');
var path = require('path');
var oppai = require('../oppai');
var users = require('../db/users');
var auth = require('../db/auth');
var Room = require("../db/rooms");
Room.init(io);

var Beatmap = require("../../lib/Beatmap");
var Util = require("../../lib/Util");

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

router.get('/', function(req, res) {
    res.render('index', { user: req.user });
});

router.get('/register', function(req, res) {
    res.render('register', { error: undefined });
});

router.post('/register', function(req, res, next) {
	users.createUser(req.body.username, req.body.password, function(err, result) {
        if (err) {
            res.render('register', { error: err.message });
            return;
        }
        console.log('Created user ' + req.body.username.trim());
        auth.authenticate('local')(req, res, function() {
            req.session.save(function(err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        });
    });  
});

router.get('/users', function(req, res) {
	users.all((err, users) => {
		//res.send(users.map(x => JSON.stringify(x)).join('<br>'));
    	res.send(users.map(x => x.username).join('<br>') + '<br><a href="/">Home</a>');
    });
});

router.get('/resetusers', function(req, res) {
	req.logout();
	users.clear();
	console.log('cleared users')
	res.send('all users deleted<br><a href="/">Home</a>');
});

router.get('/resetrooms', function(req, res) {
    Room.clear();
    console.log('cleared rooms')
    res.send('all rooms deleted<br><a href="/">Home</a>');
});

router.get('/login', function(req, res) {
    if (req.user) res.redirect('/');
    else res.render('login', { user: req.user, error: req.query.err });
});

router.post('/login', function(req, res, next) {
    auth.authenticate('local', function(err, user, info) {
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

var lobby = io.of("/lobby");

lobby.on("connection", function (socket) {
    socket.emit("rooms", Room.getPublicList());
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
        room.start(io);
        // {
        // 	map: data.map,
        // 	difficulty: difficulty,
        // };

        var url = "/d/" + room.id;

        lobby.emit("rooms", Room.getPublicList());
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