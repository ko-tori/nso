var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var parser = require('osu-parser');
var fs = require('fs');
var dl = require('delivery');
var JSZip = require('jszip');
var childProcess = require("child_process");

var Beatmap = require("./lib/Beatmap");
// (function() {
//     var oldSpawn = childProcess.spawn;
//     function mySpawn() {
//         console.log('spawn called');
//         console.log(arguments);
//         var result = oldSpawn.apply(this, arguments);
//         return result;
//     }
//     childProcess.spawn = mySpawn;
// })();

var rooms = [];

var oppai = function(path, onstdout, onstderr, onerr) {
	var star = childProcess.spawn('./oppai/oppai', [path, '-ojson']);
	star.stdout.on('data', data => {
		onstdout(JSON.parse(data))
	});
	if (onstderr) star.stderr.on('data', onstderr);
	if (onerr) star.on('error', onerr);
};

app.use(express.static('nso'));

app.get('/test/:dir/:file', function(req, res) {
  res.send(req.params.dir + ', ' + req.params.file);
});

app.get('/skin/:skin/:file', function(req, res) {
  var path = __dirname + '/nso/Skins/' + req.params.skin + '/' + req.params.file;
  if (fs.existsSync(path))
    res.sendFile(path);
  else {
    path = __dirname + '/nso/Skins/Default/' + req.params.file;
    if (fs.existsSync(path))
      res.sendFile(path);
    else
      res.sendStatus(599);
  }
});

app.get('/parsemap/:dir/:file', function(req, res) {
  var file = "nso/Songs/" + req.params.dir + "/" + req.params.file;
  parser.parseFile(file, function(err, beatmap) {
    if (err) console.log(err);
    res.json(beatmap);
  });
});

app.get('/parseskin/:file', function(req, res) {
  var file = "nso/Skins/" + req.params.file + "/skin.ini";
  parser.parseSkinFile(file, function(err, skin) {
    if (err) { console.log(err); res.json(err) }
    res.json(skin);
  });
});

io.on('connection', function(socket) {
	var delivery = dl.listen(socket);
	delivery.on('receive.success', function(file) {
		socket.emit("news", {
			status: "File uploaded successfully",
			color: "green"
		});
		console.log('Received file: ' + file.name);
		JSZip.loadAsync(file.buffer).then(function(zip) {
			var mapdir = "uploads/" + file.name.replace(/\.osz$/, '');
			try {
				fs.accessSync(mapdir);
			} catch (e) {
				fs.mkdirSync(mapdir);
			}
			var diffs = [];
			var n = zip.file(/(.+)/).length;
			var alldone = function() {
				socket.emit('diffs', diffs);
				console.log(diffs);
				var temp = function(i) {
					if (i >= diffs.length) {
						console.log("No valid beatmaps found.");
						socket.emit('osu', {
							'error': 'No standard beatmaps found.'
						});
					} else {
						var raw_data = fs.readFileSync(mapdir + '/' + diffs[i][0], {
							encoding: "utf-8"
						});
						socket.emit('osu', raw_data);
						// parser.parseFile(mapdir + '/' + diffs[i][0], function(err, beatmap) {
						// 	if (err) {
						// 		console.log(err);
						// 		socket.emit('osu', {
						// 			'error': 'Error occurred while processing files.'
						// 		});
						// 	} else if (true /*beatmap.Mode == 0*/ ) socket.emit('osu', raw_data);
						// 	else temp(i + 1);
						// });
					}
				};
				temp(0);
			};
			zip.forEach(function(path, zipEntry) {
				zip.file(path).async('arraybuffer').then(function(content) {
					fs.writeFile(mapdir + '/' + path, new Buffer(content), function() {
						if (path.slice(-4) == '.osu') {
							oppai(mapdir + '/' + path, data => {
								diffs.push([path, data["stars"]]);
								n -= 1;
								if (n == 0) {
									alldone();
								}
							}, data => {
								n -= 1;
								if (n == 0) {
									console.log("No valid beatmaps found.");
									socket.emit('osu', {
										'error': 'No standard beatmaps found.'
									});
								}
							}, code => {
								console.log(`fail: ${code}`);
							});
						} else {
							n -= 1;
							if (n == 0) {
								alldone();
							}
						}
					});
				});
			});
		});
	});
	socket.emit('news', {
		status: 'Hello!',
		color: "green"
	});
	console.log(socket.id + " Joined");
	socket.on('my other event', function(data) {
		console.log(data);
	});
});

server.listen(process.env.PORT, function() {
	console.log('Running...');
});