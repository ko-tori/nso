// Global Variables
var mouseX = 0,
	mouseY = 0,
	page_mouseX = 0,
	page_mouseY = 0;
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

var updateTime = function() {
	var t = Editor.source ? Editor.source.t : 0;
	var pct = Editor.source ? t / Editor.source.duration : 0;
	var rounded = (pct * 100).toFixed(1);
	$('#time').html(new Date(t * 1000).toISOString().substr(14, 9).replace('.', ':'));
	$('#progress').html((rounded > 100 ? 'outro' : rounded) + '%');
	var track = $('#timelinetrack');
	//$('#timelinebar').css({left:track.position().left + track.width()*pct});
	$('#timelinebar').css({
		left: track.position().left + track.width() * pct
	});
	if (pct >= 1) {
		Editor.source.pause(Editor.source.duration);
	}
}

var createTimelineMark = function(time, type) {
	if (Editor.source) {
		var mark = document.createElement('div');
		mark.classList.add('timelinemark', type);
		var track = $('#timelinetrack');
		$(mark).css({
			left: track.position().left + track.width() * (time / Editor.source.duration)
		});
		$('#timeline1c').append(mark);
		if (!Editor.timelinemarks[time])
			Editor.timelinemarks[time] = {};
		Editor.timelinemarks[time][type] = mark;
	}
};

var removeTimelineMark = function(time, type) {
	if (Editor.timelinemarks[time] && Editor.timelinemarks[time][type]) {
		Editor.timelinemarks[time][type].parentNode.removeChild(Editor.timelinemarks[time][type]);
	}
};

var addComboNumber = function(digits, n) {
	Editor.skin['default-' + n] = concatImages(digits, parseInt(Editor.skin._meta.options.HitCircleOverlap || 2, 10));
};

Editor.init = function(callback) {
	var breaks = Editor.beatmap['breakTimes'],
		tptn = 0,
		n = 1,
		skinopts = Editor.skin._meta.options;
	if (Editor.skin._meta.name != 'Default' && skinopts.Combo1 && !skinopts.ignoreSkinColors) {
		Editor.cols = [];
		while (skinopts['Combo' + n]) {
			Editor.cols.push(colorToArray(skinopts['Combo' + n]));
			n++;
		}
	} else if (Editor.beatmap.ComboColors.length == 0) {
		console.log('using default colors');
		Editor.cols = [
			[255, 192, 0],
			[0, 202, 0],
			[18, 124, 255],
			[242, 24, 57]
		];
	} else {
		Editor.cols = [];
		for (i = 0; i < Editor.beatmap.ComboColors.length; i++) {
			var temp = [];
			for (var j = 0; j < Editor.beatmap.ComboColors[i].length; j++) {
				temp.push(parseFloat(Editor.beatmap.ComboColors[i][j]));
			}
			Editor.cols.push(temp);
		}
	}
	Editor.objc = [];
	n = 0, j = 1;
	var maxc = 1,
		tptn = -1;
	for (i = 0; i < Editor.beatmap.HitObjects.length; i++) {
		if (i == 0 || Editor.beatmap.HitObjects[i].newCombo) {
			if (j > maxc) {
				maxc = j;
			}
			n++;
			j = 1;
		}
		Editor.objc.push([n, j]);
		j++;

		if (Editor.beatmap.HitObjects[i].startTime >= Editor.beatmap.TimingPoints[tptn])
			Editor.beatmap.HitObjects[i].tptn = tptn;
	}
	n = 10;
	while (n <= maxc) {
		var digits = [];
		var n2 = n.toString();
		for (j = 0; j < n2.length; j++) {
			digits.push(Editor.skin['default-' + n2.charAt(j)]);
		}
		addComboNumber(digits, n);
		n++;
	}
	var si = [];
	Editor.maxsliderdur = 0;
	for (var i = 0; i < Editor.beatmap.HitObjects.length; i++) {
		if (Editor.beatmap.HitObjects[i].objectName == 'slider') {
			if (Editor.beatmap.HitObjects[i].duration / 1000 > Editor.maxsliderdur) Editor.maxsliderdur = Editor.beatmap.HitObjects[i].duration / 1000;
			si.push(i);
		}
	}
	var tintelements = ['hitcircle', 'approachcircle', 'sliderb0'];
	for (i = 0; i < tintelements.length; i++) {
		for (j = 0; j < Editor.cols.length; j++) {
			if (tintelements[i] == 'sliderb0') {
				Editor.skin[tintelements[i] + j] = tint(Editor.skin[tintelements[i]], [0, 0, 0]);
			} else
				Editor.skin[tintelements[i] + j] = tint(Editor.skin[tintelements[i]], Editor.cols[j]);
		}
	}
	$('#timeline1c .timelinemark').remove();
	Editor.timelinemarks = {};
	if (Editor.beatmap.Bookmarks) {
		var pts = Editor.beatmap.Bookmarks;
		for (var i in pts) {
			if (pts.hasOwnProperty(i)) {
				createTimelineMark(pts[i] / 1000, 'bookmark');
			}
		}
	}
	if (Editor.beatmap.PreviewTime) createTimelineMark(Editor.beatmap.PreviewTime / 1000, 'previewtime');
	if (Editor.beatmap.TimingPoints) {
		pts = Editor.beatmap.TimingPoints;
		for (i = 0; i < pts.length; i++) {
			if (pts[i].timingChange)
				createTimelineMark(pts[i].offset / 1000, 'uninheritedpoint');
			else
				createTimelineMark(pts[i].offset / 1000, 'inheritedpoint');
		}
	}
	//setTimeout(function(){renderslidersasync(si, 10, function(){console.log('sliders done')})}, 0); //async
	//rendersliders(si, 0, callback);
};

var frame = function() {
	updateTime();
	if (Editor.source && Editor.source.playing) {
		window.requestAnimationFrame(frame);
	}
};

$(window).on("resize", function() {
	Editor.align();
	if (Editor.source) {
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
	frame();
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
		ncopt: false,
		ignoreSkinColors: false
	};

	$("#menubar>div").mouseover(function() {
		var a = $(this).offset();
		a.top += 18;
		$(this).find(".dropdown").offset(a);
	});

	document.addEventListener("contextmenu", function(e) { // right click handling
		e.preventDefault();
		console.log('rightclick! :o');
		var o = (e.srcElement || e.originalTarget);
		if (o.matches('#righttoolbar img, #lefttoolbar img, #timeline1c, #playcontrols img')) {
			var ev = document.createEvent('HTMLEvents');
			ev.initEvent('click', true, false);
			o.dispatchEvent(ev);
		}
	});

	var timelinemove = function(e) {
		if (!Editor.source) return
		var track = $('#timelinetrack');
		var w = track.width();
		var pct = Math.max(0, Math.min(page_mouseX - track.position().left, w)) / w;
		var pos = pct * Editor.source.duration;
		if (pct >= 1) Editor.source.pause(Editor.source.duration);
		else {
			var a = Editor.source.playing;
			Editor.source.pause(pos);
			if (a)
				Editor.source.play(pos);
		}
		frame();
	};

	var mousedown = false;
	$('#timeline1c').mousedown(function(e) {
		mousedown = true;
		timelinemove(e);
		$(document).mousemove(function(e) {
			if (mousedown)
				timelinemove(e);
			$(document).mouseup(function() {
				mousedown = false;
			});
		});
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
		if (e.altKey) {
			if (page_mouseX >= t.offset().left && page_mouseX <= t.offset().left + t.width() && page_mouseY >= t.offset().top && page_mouseY <= t.offset().top + t.height())
				Editor.options.distancespacing = Math.min(6, Math.max(.1, Editor.options.distancespacing + (e.wheelDelta || -e.detail) / 1200));
			else if (Editor.source)
				Editor.source.volume = Math.min(2, Math.max(0, Editor.source.volume + (e.wheelDelta || -e.detail) / 2400));
		} else if (e.ctrlKey) {

		} else if (Editor.source && Editor.beatmap) {
			var tpt = Editor.beatmap.getTimingPoint(Editor.source.t * 1000);
			var pos = Math.min(Editor.source.duration,
				Math.max(0, Editor.source.t - ((e.wheelDelta || -e.detail) / 120 *
					tpt.beatLength / 1000 /
					(Editor.source.playing ? 1 : Editor.options.beatsnapdivisor) *
					(e.shiftKey ? tpt.timingSignature : 1))));
			tpt = Editor.beatmap.getTimingPoint(pos * 1000);
			if (pos >= Editor.source.duration) Editor.source.pause(Editor.source.duration);
			else if (Editor.source.playing)
				Editor.source.play(pos);
			else {
				Editor.source.pause(Math.round(snap(pos * 1000, tpt.baseOffset, tpt.beatLength / (e.shiftKey ? 1 : Editor.options.beatsnapdivisor))) / 1000);
			}
			frame();
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
			frame();
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
			else {
				Editor.source.play();
				frame();
			}
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
			Editor.updateMouseLocation();
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
