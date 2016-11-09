// Global Variables
var mouseX = 0,
	mouseY = 0;
var keyMap = Array(256);
var width, height;

var room = location.pathname.substring(0, 2);

function dataURItoBlob(dataURI) {
	// convert base64/URLEncoded data component to raw binary data held in a string
	var byteString;
	if (dataURI.split(',')[0].indexOf('base64') >= 0)
		byteString = atob(dataURI.split(',')[1]);
	else
		byteString = unescape(dataURI.split(',')[1]);

	// separate out the mime component
	var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

	// write the bytes of the string to a typed array
	var ia = new Uint8Array(byteString.length);
	for (var i = 0; i < byteString.length; i++) {
		ia[i] = byteString.charCodeAt(i);
	}

	return new Blob([ia], { type: mimeString });
}

if (location.search) {
	// new upload initialization stuff
} else {

}

Editor.align = function() {
	height = $(window).height() * 0.75;
	width = height * 4 / 3;

	$("#centersection > canvas").attr("width", $(document).width());
	$("#centersection > canvas").attr("height", $(document).height());

	var grid = document.getElementById("grid");
	grid.style.left = ($(window).width() - width) / 2;
	grid.style.top = $(window).height() * 0.16;
	grid.style.width = width;
	grid.style.height = height;

	$("#righttoolbar > img").width($("#lefttoolbar > img")[0].width);
	$("#righttoolbar").css("top", 14 + (1 - $("#righttoolbar").height() / ($("#container").height() - $("#topsection").height() - $("#bottomsection").height())) * 50 + "%");

	if (Editor.source && Editor.timelinemarks) {
		var track = $('#timelinetrack');
		for (var time in Editor.timelinemarks) {
			if (Editor.timelinemarks.hasOwnProperty(time)) {
				for (var point in Editor.timelinemarks[time]) {
					if (Editor.timelinemarks[time].hasOwnProperty(point)) {
						$(Editor.timelinemarks[time][point]).css({
							left: track.position().left + track.width() * (time / Editor.source.duration)
						});
					}
				}
			}
		}
	}
};

Editor.render = function(ctx) {

};

var frame = function() {
	if (Editor.playing) {
		window.requestAnimationFrame(frame);
	}
};

$(window).on("resize", function() {
	Editor.align();
});

$(document).ready(function main() {
	Editor.options = {
		beatsnapdivisor: 4,
		distancespacing: 1,
		distancesnap: true,
		gridlevel: 4,
		gridsnap: true,
		locknotes: false,
		tool: 0, //0-3 for select, circle, slider, and spinner
		soundopts: [false, false, false], //whistle, finish, clap
		ncopt: false
	};
	$("#menubar>div").mouseover(function() {
		var a = $(this).offset();
		a.top += 18;
		$(this).find(".dropdown").offset(a);
	});

	document.addEventListener("contextmenu", function(e) {
		e.preventDefault();
		console.log('rightclick! :o');
		var o = (e.srcElement || e.originalTarget);
		if (o.matches('#righttoolbar img, #lefttoolbar img, #timeline1c, #playcontrols img')) {
			var ev = document.createEvent('HTMLEvents');
			ev.initEvent('click', true, false);
			o.dispatchEvent(ev);
		}
	});

	Editor.updateMouseLocation = function() {
		function r(n) {
			var d = Editor.options.gridsnap ? Editor.options.gridlevel : 1;
			return Math.round(n / d) * d;
		}
		var height = $(window).height() * .75;
		var width = height * 4 / 3;
		mouseX = r((page_mouseX - $('#grid').offset().left) / width * 512);
		mouseY = r((page_mouseY - $('#grid').offset().top) / height * 384);
	};

	var captureMouseLocation = function(e) {
		page_mouseX = e.pageX;
		page_mouseY = e.pageY;
		Editor.updateMouseLocation();
	};

	var wheelupdate = function(e) {
		var t = $('#grid');
		if (e.altKey && Editor.source && !(mousex >= t.offset().left && mousex <= t.offset().left + t.width() && mousey >= t.offset().top && mousey <= t.offset().top + t.height()))
			Editor.source.volume = Math.min(2, Math.max(0, Editor.source.volume + (e.wheelDelta || -e.detail) / 2400));
		else if (e.ctrlKey) {

		} else if (Editor.source && beatmap) {
			var tpt = getTimingPointAt(Editor.source.t);
			var pos = Math.min(Editor.source.duration,
				Math.max(0, Editor.source.t - ((e.wheelDelta || -e.detail) / 120 *
					tpt.beatLength / 1000 /
					vars.beatsnapdivisor *
					(Editor.source.getPlaying() ? 2 : 1) *
					(e.shiftKey ? tpt.timingSignature : 1))));
			if (pos >= Editor.source.duration) Editor.source.pause(Editor.source.duration);
			else if (Editor.source.getPlaying())
				Editor.source.play(pos);
			else {
				Editor.source.pause(snap(pos, tpt.baseOffset / 1000, tpt.beatLength / 1000 / (e.shiftKey ? 1 : vars.beatsnapdivisor)));
			}
		}
	};

	document.addEventListener("mousemove", captureMouseLocation, false);
	document.addEventListener("mousewheel", wheelupdate, {
		passive: true
	});

	Editor.align();
	Skin.LoadSkin('Default', function(skin) {
		Editor.skin = skin;
		Editor.audioCtx = new AudioContext();
		Editor.socket = new Socket();
		frame();
	});
});
