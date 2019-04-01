var socket = io.connect("/lobby");

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
	window.cancel = function() {
		$('.modal').fadeOut(500);
	}
	var responseHandler = function() {
		if (this.readyState == 4 && this.status == 200) {
			var options = JSON.parse(this.response);
			map = options.map;
			console.log('map', map);
			difficulties = options.difficulties;
			difficulties.sort((a, b) => {
				return a.stars - b.stars;
			});
			console.log("Choosing diff", options);
			var html = "";
			html += "<p>Please select your difficulty below.</p>";
			html += "<select id='choosediff'>";
			for (var i = 0; i < options.difficulties.length; i += 1) {
				html += "<option value='" + options.difficulties[i].choice + "'>[" + options.difficulties[i].name + '] ' + options.difficulties[i].stars.toFixed(2) + "*</option>";
			}
			html += "</select>";
			html += "<p><button onclick='javascript:go();'>Edit!</button><br><button onclick='javascript:cancel();'>Cancel</button></p>";
			$("#modalbox").html(html).fadeTo(500, 1);;
			$('#overlay').fadeTo(500, 0.8);
		} else {
		}
	};
	var upload = function (file) {
		console.log('uploading...');
		var formData = new FormData();
		formData.append("mapfile", file);
		xhr = new XMLHttpRequest();
		xhr.onreadystatechange = responseHandler;
		//xhr.onprogress = progressHandler;
		xhr.open('POST', '/', true);
		xhr.send(formData);
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
	$('#uploadinput').change(function() {
		console.log('change', this);
		upload(this.files[0]);
	});
});

