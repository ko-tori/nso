// Global Variables
var mouseX = 0,
	mouseY = 0,
	snapped_mouseX = 0,
	snapped_mouseY = 0,
	page_mouseX = 0,
	page_mouseY = 0;
var keyMap = Array(256);
var width, height;

// Debug variables
var keycodedbg = false;

var room = location.pathname.substring(0, 2);

Editor.align = function() {
	var height = $(window).height() * 0.75;
	var width = height * 4 / 3;

	$("#canvases > canvas").attr("width", $(document).width())
		.attr("height", $(document).height());

	var grid = $("#grid");
	grid.attr("width", width)
		.attr("height", height)
		.css({
			'left': ($(window).width() - width) / 2,
			'top': $(window).height() * 0.16
		});
	Editor.drawGrid();

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

Editor.render = function() {
	var height = $(window).height() * .75;
	var width = height * 4 / 3;
	var t = Editor.source.t;
	var ar = ars(Editor.beatmap['ApproachRate']);
	var cs = cspx(Editor.beatmap['CircleSize']);
	var ctx = document.getElementById('gridcanvas').getContext('2d');
	ctx.save();
	ctx.clearRect(0, 0, $(window).width(), $(window).height());
	ctx.translate(($(window).width() - width) / 2, $(window).height() * .16);
	ctx.scale(width / 512, height / 384);

	var ctx2 = document.getElementById('gridcanvas2').getContext('2d');
	ctx2.save();
	ctx2.clearRect(0, 0, $(window).width(), $(window).height());
	ctx2.translate(($(window).width() - width) / 2, $(window).height() * .16);
	ctx2.scale(width / 512, height / 384);

	var renderFrom = Editor.beatmap.getIndexAt((t - .8 - Editor.maxsliderdur) * 1000);
	var renderTo = Editor.beatmap.getIndexAt((t + ar) * 1000);
	for (var i = renderTo; i >= renderFrom; i--) {
		Editor.beatmap.HitObjects[i].render(t, Editor.objc[i][0] % Editor.cols.length, Editor.objc[i][1]);
	}
	ctx2.lineWidth = cs * 11 / 12;
	ctx2.lineJoin = 'round';
	ctx2.lineCap = 'round';
	for (var i = renderFrom; i <= renderTo; i++) {
		var obj = Editor.beatmap.HitObjects[i];
		if(!(obj instanceof Slider) || t > obj.endTime / 1000 +  obj.fadetime || t < obj.startTime / 1000 - ar) continue;
		ctx2.beginPath();
		for(var j = 0; j < obj.spline.length; j++) {
			ctx2.lineTo(obj.spline[j][0], obj.spline[j][1]);
		}
		//ctx2.stroke();
		if(ctx2.isPointInStroke(page_mouseX, page_mouseY - $('#gridcanvas2').offset().top)) {
			obj.hover();
			ctx.restore();
			ctx2.restore();
			return;
		}
	}
	ctx.restore();
	ctx2.restore();
};

Editor.hoverrender = function() {
	if(!Editor.beatmap || !Editor.source || Editor.source.playing) return;
	Editor.render();
}

Editor.setGridLevel = function(n) { //2^(n+1) pixels per cell
	Editor.options.gridlevel = n;
	Editor.drawGrid();
	Editor.updateMouseLocation();
};

var copyTextToClipboard = function(text) {
	var textArea = document.createElement("textarea");
	textArea.style.position = 'fixed';
	textArea.style.top = 0;
	textArea.style.left = 0;
	textArea.style.width = '2em';
	textArea.style.height = '2em';
	textArea.style.padding = 0;
	textArea.style.border = 'none';
	textArea.style.outline = 'none';
	textArea.style.boxShadow = 'none';
	textArea.style.background = 'transparent';
	textArea.value = text;
	document.body.appendChild(textArea);
	textArea.select();
	try {
		document.execCommand('copy');
	} catch (err) {
		console.log('copy failed');
	}
	document.body.removeChild(textArea);
}

Editor.drawGrid = function(level, grid) {
	if (!level) level = Editor.options.gridlevel;
	if (!grid) grid = $('#grid');
	var h = grid.height();
	var w = grid.width();
	var px = h / 384;
	var ctx = grid[0].getContext('2d');
	var cs = Math.pow(2, level + 1);

	ctx.clearRect(0, 0, w, h);
	ctx.strokeStyle = '#FFF';
	ctx.lineWidth = px;

	for (var i = 0; i <= 384; i += cs) {
		ctx.globalAlpha = i == 384 / 2 ? .2 : .06;
		ctx.beginPath();
		ctx.moveTo(0, i * px);
		ctx.lineTo(512 * px, i * px);
		ctx.stroke();
	}

	for (i = 0; i <= 512; i += cs) {
		ctx.globalAlpha = i == 512 / 2 ? .2 : .06;
		ctx.beginPath();
		ctx.moveTo(i * px, 0);
		ctx.lineTo(i * px, 384 * px);
		ctx.stroke();
	}
}

Editor.updateTime = function() {
	var t = Editor.source ? Editor.source.t : 0;
	var pct = Editor.source ? t / Editor.source.duration : 0;
	var rounded = (pct * 100).toFixed(1);
	$('#time').html(new Date(Math.round(t * 1000)).toISOString().substr(14, 9).replace('.', ':'));
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

Editor.createTimelineMark = function(time, type) {
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

Editor.removeTimelineMark = function(time, type) {
	if (Editor.timelinemarks[time] && Editor.timelinemarks[time][type]) {
		Editor.timelinemarks[time][type].parentNode.removeChild(Editor.timelinemarks[time][type]);
	}
};

Editor.addComboNumber = function(digits, n) {
	Editor.skin['default-' + n] = concatImages(digits, parseInt(Editor.skin._meta.options.HitCircleOverlap || 2, 10));
};

Editor.addComboColor = function(col) {
  Editor.cols.push(col);
  var tintelements = ['hitcircle', 'approachcircle', 'sliderb0'];
  for (var i = 0; i < tintelements.length; i++) {
    if (tintelements[i] == 'sliderb0') {
      Editor.skin[tintelements[i] + (vars.cols.length - 1)] = tint(Editor.skin[tintelements[i]], [0, 0, 0]);
    }
    else
      Editor.skin[tintelements[i] + (vars.cols.length - 1)] = tint(Editor.skin[tintelements[i]], col);
  }
};

Editor.init = function(callback) {
	Editor.options.distancespacing = Editor.beatmap.DistanceSpacing;
	Editor.options.gridlevel = Math.log2(Editor.beatmap.GridSize) - 1;
	Editor.setGridLevel(Editor.options.gridlevel);
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
			Editor.cols.push(Editor.beatmap.ComboColors[i].toArray());
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
		Editor.addComboNumber(digits, n);
		n++;
	}
	var si = [];
	Editor.maxsliderdur = 0;
	for (var i = 0; i < Editor.beatmap.HitObjects.length; i++) {
		if (Editor.beatmap.HitObjects[i] instanceof Slider) {
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
				Editor.createTimelineMark(pts[i] / 1000, 'bookmark');
			}
		}
	}
	if (Editor.beatmap.PreviewTime) Editor.createTimelineMark(Editor.beatmap.PreviewTime / 1000, 'previewtime');
	if (Editor.beatmap.TimingPoints) {
		pts = Editor.beatmap.TimingPoints;
		for (i = 0; i < pts.length; i++) {
			if (pts[i].timingChange)
				Editor.createTimelineMark(pts[i].offset / 1000, 'uninheritedpoint');
			else
				Editor.createTimelineMark(pts[i].offset / 1000, 'inheritedpoint');
		}
	}
	//setTimeout(function(){renderslidersasync(si, 10, function(){console.log('sliders done')})}, 0); //async
	//rendersliders(si, 0, callback);
};

var update = function() {
	if(!Editor.drawing) frame();
}

var frame = function() {
	Editor.updateTime();
	if (Editor.source && Editor.beatmap) {
		Editor.render();
		if (Editor.source.playing) {
			Editor.drawing = true;
			window.requestAnimationFrame(frame);
		}
		else {
			Editor.drawing = false;
		}
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
	update();
});

$(document).ready(function main() {
	Editor.options = {
		beatsnapdivisor: 4,
		distancespacing: 1,
		distancesnap: true,
		gridlevel: 2,
		gridsnap: true,
		locknotes: false,
		tool: 0, //0-3 for select, circle, slider, and spinner
		soundopts: [false, false, false], //whistle, finish, clap
		ncopt: false,
		ignoreSkinColors: false
	};
	Editor.copyData = '';

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
		else
			Editor.source.seek(pos);
		update();
	};

	var mousedown = false;
	$('#timeline1c').mousedown(function(e) {
		mousedown = true;
		timelinemove(e);
		$(document).mouseup(function() {
			mousedown = false;
		});
		$(document).mousemove(function(e) {
			if (mousedown)
				timelinemove(e);
		});
	});

	Editor.updateMouseLocation = function() {
		function r(n) {
			var d = Editor.options.gridsnap ? Math.pow(2, Editor.options.gridlevel + 1) : 1;
			return Math.round(n / d) * d;
		}
		var height = $(window).height() * .75;
		var width = height * 4 / 3;
		mouseX = (page_mouseX - $('#grid').offset().left) / width * 512;
		mouseY = (page_mouseY - $('#grid').offset().top) / height * 384;
		snapped_mouseX = r(mouseX);
		snapped_mouseY = r(mouseY);
		$('#mousepos').html('x:' + snapped_mouseX + ' y:' + snapped_mouseY);
		Editor.hoverrender();
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
				Editor.source.pause(snap(pos, tpt.baseOffset / 1000, tpt.beatLength / 1000 / (e.shiftKey ? 1 : Editor.options.beatsnapdivisor)));
			}
			update();
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
			update();
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
		if ((code == 67 || code == 32) && Editor.source) { //c, space
			if (code == 67 && e.ctrlKey) { //ctrl-c
				var data = 'hi';
				copyTextToClipboard(data);
				Editor.copyData = data;
				console.log('copy');
			} else if (!e.ctrlKey) {
				if (Editor.source.playing) Editor.source.pause();
				else {
					Editor.source.play();
				}
			}
		} else if (code == 89) { //y
			if (e.ctrlKey) {
				console.log('redo');
			}
		} else if (code == 90) { //z
			if (e.ctrlKey) {
				console.log('undo');
			} else {
				Editor.source.seek(Editor.beatmap.HitObjects[0].startTime / 1000);
			}
		} else if (code == 88) { //x
			if (e.ctrlKey) { //ctrl-x
				console.log('cut');
				var data = 'hi';
				copyTextToClipboard(data);
				Editor.copyData = data;
			} else {
				if (Editor.source)
					Editor.source.play(0);
			}
		} else if (code == 86) { //v
			if (e.ctrlKey) {
				console.log('paste');
			}
		} else if (code == 37 || code == 39) { //left
			if (Editor.source) {
				var tpt = Editor.beatmap.getTimingPoint(Editor.source.t * 1000);
				var pos = Editor.source.t + (code == 37 ? -1 : 1) * tpt.beatLength / 1000 / (Editor.source.playing ? 1 : Editor.options.beatsnapdivisor) * (e.shiftKey ? 4 : 1);
				tpt = Editor.beatmap.getTimingPoint(pos * 1000);
				if (!Editor.source.playing)
					pos = snap(pos, tpt.baseOffset / 1000, tpt.beatLength / 1000 / Editor.options.beatsnapdivisor);
				Editor.source.seek(pos);
			}
		} else if (code == 49) { //1
			if (e.ctrlKey) {
				Editor.setGridLevel(1);
			} else {
				$('#lefttoolbar img').removeClass('button_selected');
				$('#draw_select').addClass('button_selected');
				Editor.options.tool = 0;
			}
		} else if (code == 50) { //2
			if (e.ctrlKey) {
				Editor.setGridLevel(2);
			} else {
				$('#lefttoolbar img').removeClass('button_selected');
				$('#draw_normal').addClass('button_selected');
				Editor.options.tool = 1;
			}
		} else if (code == 51) { //3
			if (e.ctrlKey) {
				Editor.setGridLevel(3);
			} else {
				$('#lefttoolbar img').removeClass('button_selected');
				$('#draw_slider').addClass('button_selected');
				Editor.options.tool = 2;
			}
		} else if (code == 52) { //4
			if (e.ctrlKey) {
				Editor.setGridLevel(4);
			} else {
				$('#lefttoolbar img').removeClass('button_selected');
				$('#draw_spinner').addClass('button_selected');
				Editor.options.tool = 3;
			}
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
		} else if (code == 71) { //g
			Editor.setGridLevel(Editor.options.gridlevel % 4 + 1);
		}
		update();
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
		update();
	});
});
