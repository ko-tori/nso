var Editor = Editor || {};
class Socket {
	static get_file(path, responseType, complete, progress) {
		var oReq = new XMLHttpRequest();
		oReq.open("GET", path, true);
		if (responseType) oReq.responseType = responseType;

		if (progress) oReq.addEventListener("progress", (e) => { progress(e.loaded / e.total); });
		oReq.addEventListener("load", (e) => { complete(responseType ? oReq.response : oReq.responseText); });

		oReq.send(null);
	}
	static get_osu(callback) {
		if (Editor.fileInfo && Editor.fileInfo.difficulty) {
			console.log(Editor.beatmap);
			document.title = `${Editor.beatmap.ArtistUnicode} - ${Editor.beatmap.TitleUnicode} [${Editor.beatmap.Version}]`;
			if (callback) callback();
			// Socket.get_file(`/f/${Editor.roomID}/${Editor.fileInfo.difficulty}`, false, function(content) {
			// 	Editor.beatmap = Beatmap.ParseString(content);
			// 	document.title = Editor.beatmap.ArtistUnicode + ' - ' + Editor.beatmap.TitleUnicode + ' [' + Editor.beatmap.Version + ']';
			// 	if (callback) callback();
			// }, function(p) {
			// 	Editor.updateStatus(`Loading beatmap: ${Math.round(p*100)}%`);
			// });
		} else {
			console.log('%cDifficulty not found!', 'color: #F00');
			alert('Room does not exist. Redirecting to homepage...');
			window.location.href = window.location.origin;
		}
	}

	static get_mp3(callback) {
		var done = false, t;
		if (Editor.beatmap && Editor.beatmap.AudioFilename) {
			Socket.get_file(`/f/${Editor.roomID}/${Editor.beatmap.AudioFilename}`, 'arraybuffer', function (content) {
				Editor.audioCtx.decodeAudioData(content).then(function (buffer) {
					if (Editor.source) {
						t = Editor.source.t;
						Editor.source.stop();
					} else {
						t = parseFloat(localStorage[Editor.roomID + 't']);
					}
					Editor.source = new Player(buffer, Editor.audioCtx);
					if (t) {
						Editor.source.t = t;
						console.log('Resuming from time: ' + t);
					}
					var v = parseFloat(localStorage[Editor.roomID + 'v']);
					if (v) {
						Editor.source.volume = v;
						console.log('Using volume: ' + v);
					}
					if (callback) callback();
				});
			}, function (p) {
				if (done) return;
				if (p == 1) done = true;
				Editor.updateStatus(`Loading audio: ${Math.round(p * 100)}%`);
			});
		} else {
			console.log('%cThis map has no audio!', 'color: #F00');
			Editor.beatmap.AudioFilename = '';
			if (callback) callback();
		}
	}

	static get_bg(callback) {
		if (Editor.beatmap && Editor.beatmap.bgFilename) {
			Socket.get_file(`/f/${Editor.roomID}/${Editor.beatmap.bgFilename}`, 'blob', function (blob) {
				var $old = $('#backgrounds .bg');
				var $new = $old.clone();
				$new.css('background', `url(${URL.createObjectURL(blob)}) no-repeat center center fixed`)
					.css('background-size', 'cover')
					.css('display', 'none')
					.appendTo('#backgrounds');
				$new.fadeIn(1000);
				$old.fadeOut(1000, function () {
					$(this).remove();
				});
				if (callback) callback();
			}, function (p) {
				Editor.updateStatus(`Loading background: ${Math.round(p * 100)}%`);
			});

		} else {
			console.log('%cThis map has no background!', 'color: #F00');
			Editor.beatmap.bgFilename = '';
			if (callback) callback();
		}
	}
	constructor() {
		this.room = {};
		var socket = this.instance = io.connect(location.pathname);

		var _this = this;

		socket.on("news", function (data) {
			console.log("%cServer: " + data.status, "color:" + (data.color || "#000"));
		});
		socket.on('diffs', function (data) {
			Editor.diffs = data;
		});
		socket.on("disconnect", function () {
			console.log("disconnected");
			Editor.connected = false;
		});
		socket.on("connect", function () {
			Editor.connected = true;

			socket.on("hi", function (data) {
				socket.emit("join", 'placeholder'); //username will go here, passwords can be added through _this
				Editor.beatmap = Beatmap.unjson(data);
				Editor.fileInfo = { difficulty: Editor.beatmap.Version };
				// if (Editor.beatmap) return;
				Socket.get_osu(function () {
					Socket.get_bg(function () {
						Socket.get_mp3(function () {
							Editor.init();
							Editor.loading = false;
							$('#cover').fadeOut();
							$('#loading').fadeOut();
						});
					});
				});
			});

			socket.on('join', function (data) {
				if (!data[0].includes(socket.id)) {
					console.log(data[0] + " joined");
					_this.room[data[0]] = [];
				}
			});

			socket.on('leave', function (data) {
				console.log(data + " left");
				delete _this.room[data];
			});

			socket.on("badurl", function (data) {
				alert('Room does not exist. Redirecting to homepage...');
				window.location.href = window.location.origin;
			});

			socket.on("msg", function (data) {
				console.log("Message: ", data);
			});

			socket.on('edit move', function (data) {
				var obj = Editor.beatmap.matchObj(data[0]);
				if (obj) {
					var dx = data[1] - obj.position.x,
						dy = data[2] - obj.position.y;
					Editor.MapUtils.moveObject(obj, dx, dy);
				} else {
					console.log('object not found!');
				}
				Editor.renderupdate();
			});
		});
	}

	send(msg) {
		this.instance.emit('msg', msg);
	}

	edit_move(obj, x, y) {
		this.instance.emit('edit move', [obj, x, y]);
	}
}
Editor.Socket = Socket;