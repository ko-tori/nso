var socket = io.connect("/lobby");
var modal = $("[data-remodal-id=modal]").remodal({
	hashTracking: false
});
socket.on("connect", function () {
	var map;
	var difficulties;
	socket.on("rooms", function (rooms) {
		console.log(rooms);
		var html = "";
		html += "<ul>";
		if (rooms.length === 0) html += "<li><a id='norooms'>No rooms currently.</a></li>";
		for (var i = 0; i < rooms.length; i += 1) {
			var room = rooms[i];
			if (!room.url || !room.difficulty) continue;
			html += "<li><a href='" + room.url + "'>" + room.difficulty + "</a></li>";
		}
		html += "</ul>";
		$("#rooms").html(html);
	});
	socket.on("choose diff", function (options) {
		map = options.map;
		difficulties = options.difficulties;
		console.log("Choosing diff", options);
		var html = "";
		html += "<p>Please select your difficulty below.</p>";
		html += "<select id='choosediff'>";
		for (var i = 0; i < options.difficulties.length; i += 1) {
			html += "<option value='" + options.difficulties[i].choice + "'>" + options.difficulties[i].version + "</option>";
		}
		html += "</select>";
		html += "<p><button onclick='javascript:go();'>Edit!</button></p>";
		$("#modal").html(html);
	});
	socket.on("redirect to", function (url) {
		window.location.href = url;
	});
	window.go = function () {
		var diff = $("#choosediff").val();
		for (var i = 0; i < difficulties.length; i++) {
			if (difficulties[i].choice == diff) {
				var difficulty = difficulties[i];
				socket.emit("get url", {
					"map": map,
					"difficulty": difficulty.choice
				});
			}
		}
	};
	var upload = function (file) {
		var delivery = new Delivery(socket);
		delivery.on("delivery.connect", function (delivery) {
			console.log('sending...');
			delivery.send(file, {});
		});
		delivery.on("send.success", function (file) {
			console.log("File was sent to the server:", file);
			modal.open();
		});
	};
	$("#dropzone").on("drag dragstart dragend dragover dragenter dragleave drop", function (e) {
		e.preventDefault();
		e.stopPropagation();
	})
		.on("dragover dragenter", function () {
			$(this).addClass("is-dragover");
		})
		.on("dragleave dragend drop", function () {
			$(this).removeClass("is-dragover");
		})
		.on("drop", function (e) {
			// console.log("Dropped.", e);
			upload(e.originalEvent.dataTransfer.files[0]);
		});
});
