var Editor = Editor || {};
class Socket {
	constructor() {
		this.room = {};
		var socket = this.instance = io.connect(location.pathname);

		var _this = this;

		socket.on("news", function(data) {
			console.log("%cServer: " + data.status, "color:" + (data.color || "#000"));
		});
		socket.on("disconnect", function() {
			console.log("disconnected");
			Editor.connected = false;
		});
		socket.on("connect", function() {
			Editor.connected = true;

			socket.on("hi", function(data) {
				socket.emit("join", 'placeholder'); //username will go here, passwords can be added through _this
				Editor.fileInfo = data;
			});

			socket.on('join', function(data) {
				console.log(data);
				if (!data[0].includes(socket.id)) {
					console.log(data[0] + " joined");
					_this.room[data[0]] = [];
				}
			});

			socket.on('leave', function(data) {
				console.log(data + " left");
				delete _this.room[data];
			});

			socket.on("msg", function(data) {
				console.log("Message: ", data);
			});

			if (Editor.beatmap) return;

			_this.delivery = new Delivery(socket);

			// _this.delivery.on('receive.start', function(fileUID) {
			// 	console.log('Receiving a file!');
			// });

			_this.delivery.on("receive.success", function(file) {
				console.log("File received.");
				var jszip = JSZip();
				jszip.loadAsync(file.data, { base64: true }).then(function(zip) {
					//Editor.osz = zip;
					zip.file(Editor.fileInfo.difficulty).async("string").then(function(content) {
						Editor.beatmap = Beatmap.ParseString(content);
						if (Editor.beatmap.bgFilename && zip.file(Editor.beatmap.bgFilename)) {
							zip.file(Editor.beatmap.bgFilename).async('base64').then(function(content) {
								var $old = $('#backgrounds .bg')
								var $new = $old.clone();
								$new.css('background', 'url(data:image/jpeg;base64,' + content + ') no-repeat center center fixed')
									.css('background-size', 'cover')
									.css('display', 'none')
									.appendTo('#backgrounds');
								$new.fadeIn(1000);
								$old.fadeOut(1000, function() {
									$(_this).remove();
								});
							});
						} else {
							$('#backgrounds .bg').css('background', '')
								.css('background-size', '');
							console.log('%cThis map has no background!', 'color: #F00');
						}
						if (Editor.beatmap.AudioFilename && zip.file(Editor.beatmap.AudioFilename)) {
							zip.file(Editor.beatmap.AudioFilename).async('arraybuffer').then(function(content) {
								Editor.audioCtx.decodeAudioData(content).then(function(buffer) {
									if (Editor.source) Editor.source.stop();
									Editor.source = new Player(buffer, Editor.audioCtx);
									Editor.init();
									Editor.loading = false;
									$('#loading').fadeOut();
									$("#cover").fadeOut();
								});
							});
						} else {
							Editor.init();
							Editor.loading = false;
							$('#loading').fadeOut();
							$("#cover").fadeOut();
						}
					});
				});
			});

			socket.on('edit move', function(data) {
				//var obj = beatmap.matchObj(data[0]);
				var obj = Editor.beatmap.HitObjects[Editor.beatmap.getIndexAt(HitObject.parse(data[0]).startTime)];
				if (obj) {
					obj.position.x = data[1];
					obj.position.y = data[2];
				} else {
					console.log('object not found!');
				}
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
