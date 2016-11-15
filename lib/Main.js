// Global Variables
var mouseX = 0,
	mouseY = 0;
var keyMap = Array(256);
var width, height;

// Debug variables
var keycodedbg = false;

var room = location.pathname.substring(0, 2);

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
		$('#mousepos').html('x:' + mouseX + ' y:' + mouseY);
	};

	var captureMouseLocation = function(e) {
		page_mouseX = e.pageX;
		page_mouseY = e.pageY;
		Editor.updateMouseLocation();
	};

	var wheelupdate = function(e) {
		var t = $('#grid');
		if (e.altKey && Editor.source && !(mouseX >= t.offset().left && mouseX <= t.offset().left + t.width() && mouseY >= t.offset().top && mouseY <= t.offset().top + t.height()))
			Editor.source.volume = Math.min(2, Math.max(0, Editor.source.volume + (e.wheelDelta || -e.detail) / 2400));
		else if (e.ctrlKey) {

		} else if (Editor.source && Editor.beatmap) {
			var tpt = Editor.beatmap.getTimingPoint(Editor.source.t);
			var pos = Math.min(Editor.source.duration,
				Math.max(0, Editor.source.t - ((e.wheelDelta || -e.detail) / 120 *
					tpt.beatLength / 1000 /
					Editor.options.beatsnapdivisor *
					(Editor.source.playing ? 2 : 1) *
					(e.shiftKey ? tpt.timingSignature : 1))));
			if (pos >= Editor.source.duration) Editor.source.pause(Editor.source.duration);
			else if (Editor.source.playing)
				Editor.source.play(pos);
			else {
				Editor.source.pause(snap(pos, tpt.baseOffset / 1000, tpt.beatLength / 1000 / (e.shiftKey ? 1 : Editor.options.beatsnapdivisor)));
			}
		}
	};

	document.addEventListener("mousemove", captureMouseLocation, false);
	document.addEventListener("mousewheel", wheelupdate, {
		passive: true
	});

	var controlclicked = function(elem) {
		elem.removeClass("scalable");
		setTimeout(function() {
			elem.addClass("scalable")
		}, 40);
	};

	$('#editorplay').click(function() {
		if (Editor.source) {
			if (Editor.source.playing) Editor.source.play(0);
			else Editor.source.play();
		}
		controlclicked($(this));
	});

	$('#editorpause').click(function() {
		if (Editor.source) {
			if (Editor.source.playing) Editor.source.pause();
			else Editor.source.play();
		}
		controlclicked($(this));
	});

	$('#editorstop').click(function() {
		if (Editor.source)
			Editor.source.pause(0);
		controlclicked($(this));
	});

	$('#righttoolbar img').click(function() {
		$(this).toggleClass('button_selected');
		switch (this.id) {
			case 'draw_newcombo':
				Editor.options.ncopt = !Editor.options.ncopt;
				break;
			case 'sound_whistle':
				Editor.options.soundopts[0] = !Editor.options.soundopts[0];
				break;
			case 'sound_finish':
				Editor.options.soundopts[1] = !Editor.options.soundopts[1];
				break;
			case 'sound_clap':
				Editor.options.soundopts[2] = !Editor.options.soundopts[2];
				break;
			case 'draw_beatsnap':
				Editor.options.gridsnap = !Editor.options.gridsnap;
				Editor.updateMouseLocation();
				break;
			case 'draw_distsnap':
				Editor.options.distancesnap = !Editor.options.distancesnap;
				break;
		}

	});

	$('#lefttoolbar img').click(function() {
		$('#lefttoolbar img').removeClass('button_selected');
		$(this).addClass('button_selected');
		Editor.options.tool = $(this).index();
	});

	var keypresshandler = function(e) {
		var code = (window.event) ? event.keyCode : e.keyCode;
		if (!(code == 122 || code == 123)) {
			e.preventDefault();
		}
		if (keycodedbg) console.log("keycode: ", code);
		if (!keyMap[16] && code == 16) {
			$('#draw_beatsnap').toggleClass('button_selected');
			Editor.options.gridsnap = !Editor.options.gridsnap;
			Editor.updateMouseLocation();
		}
		if (!keyMap[18] && code == 18) {
			$('#draw_distsnap').toggleClass('button_selected');
			Editor.options.distancesnap = !Editor.options.distancesnap;
		}
		keyMap[code] = true;
		if (code == 32 && Editor.source) { //space
			if (Editor.source.playing) Editor.source.pause();
			else Editor.source.play();
		} else if (code == 49) { //1
			$('#lefttoolbar img').removeClass('button_selected');
			$('#draw_select').addClass('button_selected');
			Editor.options.tool = 0;
		} else if (code == 50) { //2
			$('#lefttoolbar img').removeClass('button_selected');
			$('#draw_normal').addClass('button_selected');
			Editor.options.tool = 1;
		} else if (code == 51) { //3
			$('#lefttoolbar img').removeClass('button_selected');
			$('#draw_slider').addClass('button_selected');
			Editor.options.tool = 2;
		} else if (code == 52) { //4
			$('#lefttoolbar img').removeClass('button_selected');
			$('#draw_spinner').addClass('button_selected');
			Editor.options.tool = 3;
		} else if (code == 81) { //q
			$('#draw_newcombo').toggleClass('button_selected');
			Editor.options.ncopt = !Editor.options.ncopt;
		} else if (code == 87) { //w
			$('#sound_whistle').toggleClass('button_selected');
			Editor.options.soundopts[0] = !Editor.options.soundopts[0];
		} else if (code == 69) { //e
			$('#sound_finish').toggleClass('button_selected');
			Editor.options.soundopts[1] = !Editor.options.soundopts[1];
		} else if (code == 82) { //r
			$('#sound_clap').toggleClass('button_selected');
			Editor.options.soundopts[2] = !Editor.options.soundopts[2];
		} else if (code == 84) { //t
			$('#draw_beatsnap').toggleClass('button_selected');
			Editor.options.gridsnap = !Editor.options.gridsnap;
		} else if (code == 89) { //y
			$('#draw_distsnap').toggleClass('button_selected');
			Editor.options.distsnap = !Editor.options.distsnap;
		} else if (code == 76) { //l
			$('#draw_lock').toggleClass('button_selected');
			Editor.options.locknotes = !Editor.options.locknotes;
		}
	};

	var keyuphandler = function(e) {
		e.preventDefault();
		var code = (window.event) ? event.keyCode : e.keyCode;
		keyMap[code] = false;
		if (code == 16) {
			$('#draw_beatsnap').toggleClass('button_selected');
			Editor.options.gridsnap = !Editor.options.gridsnap;
			Editor.updateMouseLocation();
		}
		if (code == 18) {
			$('#draw_distsnap').toggleClass('button_selected');
			Editor.options.distancesnap = !Editor.options.distancesnap;
		}
	};

	document.addEventListener('keydown', keypresshandler, false);
	document.addEventListener('keyup', keyuphandler, false);

	Editor.align();
	Skin.LoadSkin('Default', function(skin) {
		Editor.skin = skin;
		Editor.audioCtx = new AudioContext();
		Editor.socket = new Socket();
		Editor.align();
		frame();
	});
});
