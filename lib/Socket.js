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
				socket.emit("join", socket.id); //username will go here, passwords can be added through _this
				Editor.fileInfo = data;
			});

			socket.on('join', function(data) {
				if (!data[0].includes(socket.id)) {
					console.log(data + " joined");
					_this.room[data] = [];
				}
			});

			socket.on('leave', function(data) {
				console.log(data + " left");
				delete _this.room[data];
			});

			socket.on("msg", function(data) {
				console.log("Message: ", data);
			});

			_this.delivery = new Delivery(socket);

			// _this.delivery.on('receive.start', function(fileUID) {
			// 	console.log('Receiving a file!');
			// });

			_this.delivery.on("receive.success", function(file) {
				console.log("File received.");
				Editor.osz = file;
				var jszip = JSZip();
				jszip.loadAsync(file.data, { base64: true }).then(function(zip) {
					//Editor.zip = zip; //debug
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
		});
	}

	send(msg) {
		this.instance.emit('msg', msg);
	}
}
Editor.Socket = Socket;
