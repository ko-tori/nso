var Editor = Editor || {};
class Socket {
    constructor() {
        this.instance = io.connect();
        this.instance.on("news", function(data) {
            console.log("%cServer: " + data.status, "color:" + (data.color || "#000"));
        });
        this.instance.on("disconnect", function() {
            console.log("disconnected");
            Editor.connected = false;
        });
        this.instance.on("connect", function() {
            this.room = {};
            Editor.connected = true;
            var delivery = new Delivery(this.instance);
            this.instance.on("hi", function(data) {
                socket.emit("join", socket.id); //username will go here, passwords can be added through this
                Editor.fileInfo = data;
                delivery.on("receive.success", function(file) {
                    Editor.osz = file;
                    var jszip = JSZip();
                    jszip.loadAsync(file).then(function(zip) {
                        zip.file(fileInfo.difficulty).async("string").then(function(content) {
                            Editor.beatmap = Beatmap.ParseString(content);
                        });
                        if (Editor.beatmap.bgFilename && zip.file(Editor.beatmap.bgFilename)) {
                            zip.file(beatmap.bgFilename).async('base64').then(function(content) {
                                var $old = $('#backgrounds .bg')
                                var $new = $old.clone();
                                $new.css('background', 'url(data:image/jpeg;base64,' + content + ') no-repeat center center fixed')
                                    .css('background-size', 'cover')
                                    .css('display', 'none')
                                    .appendTo('#backgrounds');
                                $new.fadeIn(1000);
                                $old.fadeOut(1000, function() {
                                    $(this).remove();
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
                                });
                            });
                        }
                        Editor.loading = false;
                        $('#loading').fadeOut();
                        $("#cover").fadeOut();
                    });
                });
            });
            socket.on('join', function(data) {
                if (!data[0].includes(socket.id)) {
                    this.room[data] = [];
                }
            });

            socket.on('leave', function(data) {
                delete this.room[data];
            });
        });
    }
}
Editor.Socket = Socket;