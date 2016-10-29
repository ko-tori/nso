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
			$("#cover").fadeOut();
			$("#loading").fadeOut();

			Editor.loading = false;
			Editor.connected = true;

			var delivery = new Delivery(this.instance);
			delivery.on("delivery.connect", function(delivery) {
				$("#oszupload").click(function() {
					// if (source) source.pause();
					$("#cover").fadeIn();
					$("#fileuploadpanel").slideDown();
				});
				$("#cover").click(function() {
					if (!Editor.loading) {
						$("#cover").fadeOut();
						$("#fileuploadpanel").slideUp();
					}
				});

				var upload = function(file) {
					var extraParams = {};
					var newZip = JSZip();
					newZip.loadAsync(file).then(function(zip) {
						Editor.zipFile = zip;
						delivery.send(file, extraParams);

						var temp = function(data) {
							if (data.error) {
								console.log("%cServer: " + data.error, "color:#F00");
							} else {
								Editor.beatmap = Beatmap.ParseString(data);
								console.log("Data", Editor.beatmap);
								Editor.loading = false;
								$("#loading").fadeOut();
								$("#cover").fadeOut();
							}
							this.instance.removeListener("osu", temp);
						}
						Editor.loading = true;
						$("#loading").fadeIn();
						this.instance.on("osu", temp);
					});
					$("#fileuploadpanel").slideUp();
				};
				$("#fileuploadsubmit").click(function(e) {
					e.preventDefault();
					upload($("#fileupload")[0].files[0])
				});
			});
			delivery.on("send.success", function(fileUid) {
				console.log("File was successfully sent.");
			});
		});
	}
}

Editor.Socket = Socket;