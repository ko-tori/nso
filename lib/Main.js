// Global Variables
var mouseX = 0, //actual mouse position in the coordinates of the playfield
	mouseY = 0,
	snapped_mouseX = 0, //position of object being edited, or snapped cursor location
	snapped_mouseY = 0,
	page_mouseX = 0, //absolute position on page (actual position on canvas has page_mouseY - 24)
	page_mouseY = 0;
var keyMap = Array(256);

// Debug variables
var keycodedbg = false;

var isMouseinElement = function(elem) {
	var e = $(elem);
	if (e.length != 1) return false;
	return page_mouseX >= e.offset().left && page_mouseX <= e.offset().left + e.width() && page_mouseY >= e.offset().top && page_mouseY <= e.offset().top + e.height();
};

Editor.roomID = location.pathname.split('/').splice(-1)[0];

Editor.updateStatus = function (status) {
	$('#statuslabel').html(status).stop().fadeIn(0).fadeOut(3000);
};

$('#statuslabel').mouseover(function () {
	$(this).fadeOut(1000);
});

var toggleFullScreen = function () {
	var el = document.getElementById('fullscreen');
	el.src = el.src.endsWith("/stuff/editor-fullscreen.png") ? "/stuff/editor-unfullscreen.png" : "/stuff/editor-fullscreen.png";
	if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {
		if (document.documentElement.requestFullscreen) {
			document.documentElement.requestFullscreen();
		} else if (document.documentElement.msRequestFullscreen) {
			document.documentElement.msRequestFullscreen();
		} else if (document.documentElement.mozRequestFullScreen) {
			document.documentElement.mozRequestFullScreen();
		} else if (document.documentElement.webkitRequestFullscreen) {
			document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		}
	} else {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.msExitFullscreen) {
		document.msExitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}
	}
};

Editor.align = function () {
	var height = $(window).height() * 0.75;
	var width = height * 4 / 3;

	$("#canvases > canvas").attr("width", $(window).width())
		.attr("height", $(window).height());

	$('#timeline2').attr("width", $(window).width() * 0.8)
		.attr("height", $(window).height() * 0.12);

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

Editor.renderTimeline  = function() {
	var tctx = document.getElementById('timeline2').getContext('2d'),
		width = tctx.canvas.width,
		height = tctx.canvas.height;
	tctx.clearRect(0, 0, width, height);
	tctx.save();
	var renderFrom = Editor.beatmap.getIndexAt((Editor.source.t - 4 / Editor.options.timelinezoom - Editor.maxsliderdur) * 1000),
		renderTo = Editor.beatmap.getIndexAt((Editor.source.t + 4 / Editor.options.timelinezoom) * 1000);
	for (var i = renderTo; i >= renderFrom; i--) {
		if (Editor.beatmap.HitObjects[i].timelineRender())
			Editor.rendered.add(Editor.beatmap.HitObjects[i]);
	}
	tctx.restore();
	tctx.strokeStyle = '#FFF';
	tctx.lineWidth = 1.5;
	tctx.beginPath();
	tctx.moveTo(0, height - 3);
	tctx.lineTo(width, height - 3);
	tctx.moveTo(width / 2 - 1.5, height / 10);
	tctx.lineTo(width / 2 - 1.5, height - 3);
	tctx.moveTo(width / 2 + 1.5, height / 10);
	tctx.lineTo(width / 2 + 1.5, height - 3);
	tctx.stroke();
	function mod(m, n) {
		return ((m % n) + n) % n;
	}
	var t = Editor.source.t,
		d = Editor.options.beatsnapdivisor,
		tpt = Editor.beatmap.getTimingPoint(t * 1000),
		beatl = tpt.beatLength / 1000,
		lbound = t - 4 / Editor.options.timelinezoom,
		rbound = t + 4 / Editor.options.timelinezoom,
		beat1 = lbound - mod(lbound - tpt.baseOffset / 1000, beatl * tpt.timingSignature),
		beat1pos = ((beat1 - t) * Editor.options.timelinezoom / 8 + .5) * width;

	// measure bars
	tctx.beginPath();
	for (var x = beat1pos; x < width; x += beatl * tpt.timingSignature * Editor.options.timelinezoom / 8 * width) {
		tctx.moveTo(x, height * 0.6);
		tctx.lineTo(x, height - 3);
	}
	tctx.stroke();

	x = 0;
	for (var i = 0; x < width; i++) {
		var j = i % d, yfrom;
		x = beat1pos + i * beatl * Editor.options.timelinezoom / 8 * width / d;

		if (x < 0 || i % (d * tpt.timingSignature) === 0) continue;
		if (j === 0) {
			yfrom = height * 0.8;
			tctx.strokeStyle = '#FFF';
		} else if ((j / d * 2) % 1 === 0) {
			yfrom = height * 0.9;
			tctx.strokeStyle = '#F33';
		} else if ((j / d * 4) % 1 === 0) {
			yfrom = height * 0.9;
			tctx.strokeStyle = '#33F';
		} else if ((j / d * 3) % 1 === 0) {
			yfrom = height * 0.9;
			tctx.strokeStyle = '#B6E';
		} else if ((j / d * 6) % 1 === 0) {
			yfrom = height * 0.9;
			tctx.strokeStyle = '#B6E';
		} else if ((j / d * 8) % 1 === 0) {
			yfrom = height * 0.9;
			tctx.strokeStyle = '#FF4';
		} else if ((j / d * 12) % 1 === 0) {
			yfrom = height * 0.9;
			tctx.strokeStyle = '#AAA';
		} else if ((j / d * 16) % 1 === 0) {
			yfrom = height * 0.9;
			tctx.strokeStyle = '#AAA';
		}

		tctx.beginPath();
		tctx.moveTo(x, yfrom);
		tctx.lineTo(x, height - 3);
		tctx.stroke();
	}
	
	var fadew = 25,
		temp = document.createElement('canvas'),
        tx = temp.getContext('2d');
    temp.width = width;
    temp.height = height;
    tx.translate(-temp.width, 0);
    tx.shadowOffsetX = temp.width;
    tx.shadowOffsetY = 0;
    tx.shadowColor = '#000';
    tx.shadowBlur = fadew;
    tx.fillRect(fadew, 0, width - fadew * 2, height);
    tctx.save();
    tctx.globalCompositeOperation = 'destination-in';
    tctx.drawImage(temp, 0, 0);
    tctx.restore();
};

Editor.render = function () {
	//timeline rendering
	Editor.rendered = new Set();
	Editor.renderTimeline();

    //object rendering
	var height = $(window).height() * 0.75,
		width = height * 4 / 3,
		t = Editor.source.t,
		ar = ars(Editor.beatmap.ApproachRate),
		cs = cspx(Editor.beatmap.CircleSize),
		temp;
	var ctx = document.getElementById('gridcanvas').getContext('2d');
	ctx.save();
	ctx.clearRect(0, 0, $(window).width(), $(window).height());
	ctx.translate(($(window).width() - width) / 2, $(window).height() * 0.16);
	ctx.scale(width / 512, height / 384);

	var ctx2 = document.getElementById('gridcanvas2').getContext('2d');
	ctx2.save();
	ctx2.clearRect(0, 0, $(window).width(), $(window).height());
	ctx2.translate(($(window).width() - width) / 2, $(window).height() * 0.16);
	ctx2.scale(width / 512, height / 384);

	var renderFrom = Editor.beatmap.getIndexAt((t - 0.8 - Editor.maxsliderdur) * 1000),
		renderTo = Editor.beatmap.getIndexAt((t + ar) * 1000);
	for (var i = renderTo; i >= renderFrom; i--) {
		if (Editor.beatmap.HitObjects[i].render(t, Editor.objc[i][0] % Editor.cols.length, Editor.objc[i][1]))
			Editor.rendered.add(Editor.beatmap.HitObjects[i]);
	}

	//selected objects
	ctx.globalAlpha = 1;
	for (i = 0; i < Editor.selected.length; i++) {
		if(!(Editor.selected[i] instanceof Spinner))
			ctx.drawImage(Editor.skin.hitcircleselect, Editor.selected[i].position.x - cs / 2, Editor.selected[i].position.y - cs / 2, cs, cs);
	}

	//hovered objects
	ctx2.lineWidth = cs * 11 / 12;
	ctx2.lineJoin = 'round';
	ctx2.lineCap = 'round';
	for (i = renderFrom; i <= renderTo; i++) {
		var obj = Editor.beatmap.HitObjects[i];
		if (!(obj instanceof Slider) || t > obj.endTime / 1000 + obj.fadetime || t < obj.startTime / 1000 - ar) continue;
		if (!obj.path) {
			ctx2.beginPath();
			for (var j = 0; j < obj.spline.length; j++) {
				ctx2.lineTo(obj.spline[j][0], obj.spline[j][1]);
			}
			temp = ctx2.isPointInStroke(page_mouseX, page_mouseY - $('#gridcanvas2').offset().top);
		} else
			temp = ctx2.isPointInStroke(obj.path, page_mouseX, page_mouseY - $('#gridcanvas2').offset().top);
		if (temp) {
			obj.hover();
			ctx.restore();
			ctx2.restore();
			return;
		}
	}
	ctx.restore();
	ctx2.restore();
};

Editor.renderupdate = function () { // for updates that only change rendering
	if (!Editor.beatmap || !Editor.source || Editor.source.playing) return;
	Editor.render();
};

Editor.setGridLevel = function (n) { //2^(n+1) pixels per cell
	Editor.options.gridlevel = n;
	Editor.drawGrid();
	Editor.updateMouseLocation();
};

var copyTextToClipboard = function (text) {
	var textArea;
	try {
		textArea = document.createElement("textarea");
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
		document.execCommand('copy');
	} catch (err) {
		console.log('copy failed');
	}
	document.body.removeChild(textArea);
};

Editor.drawGrid = function (level, grid) {
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
		ctx.globalAlpha = i == 384 / 2 ? 0.2 : 0.06;
		ctx.beginPath();
		ctx.moveTo(0, i * px);
		ctx.lineTo(512 * px, i * px);
		ctx.stroke();
	}

	for (i = 0; i <= 512; i += cs) {
		ctx.globalAlpha = i == 512 / 2 ? 0.2 : 0.06;
		ctx.beginPath();
		ctx.moveTo(i * px, 0);
		ctx.lineTo(i * px, 384 * px);
		ctx.stroke();
	}
};

Editor.updateTime = function() {
	var t = Editor.source ? Math.min(Editor.source.t, Editor.source.duration) : 0;
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
};

Editor.createTimelineMark = function (time, type) {
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

Editor.removeTimelineMark = function (time, type) {
	if (Editor.timelinemarks[time] && Editor.timelinemarks[time][type]) {
		Editor.timelinemarks[time][type].parentNode.removeChild(Editor.timelinemarks[time][type]);
	}
};

Editor.init = function (callback) {
	var i, pts;
	Editor.options.distancespacing = Editor.beatmap.DistanceSpacing;
	Editor.options.gridlevel = Math.log2(Editor.beatmap.GridSize) - 1;
	Editor.options.timelinezoom = parseFloat(Editor.beatmap.TimelineZoom);
	var breaks = Editor.beatmap.breakTimes,
		tptn = 0,
		n = 1,
		skinopts = Editor.skin._meta.options;
	if (Editor.skin._meta.name != 'Default' && skinopts.Combo1 && !skinopts.ignoreSkinColors) {
		Editor.cols = [];
		while (skinopts['Combo' + n]) {
			Editor.cols.push(colorToArray(skinopts['Combo' + n]));
			n++;
		}
	} else if (Editor.beatmap.ComboColors.length === 0) {
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
	n = 0;
	j = 1;
	var maxc = 1;
	tptn = -1;
	for (i = 0; i < Editor.beatmap.HitObjects.length; i++) {
		if (i === 0 || (Editor.beatmap.HitObjects[i].newCombo)) {
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
		Editor.skin.addComboNumber(digits, n);
		n++;
	}
	var si = [];
	Editor.maxsliderdur = 0;
	for (i = 0; i < Editor.beatmap.HitObjects.length; i++) {
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
		pts = Editor.beatmap.Bookmarks;
		for (i in pts) {
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
	Editor.setGridLevel(Editor.options.gridlevel);
	Editor.update();
	//setTimeout(function(){renderslidersasync(si, 10, function(){console.log('sliders done')})}, 0); //async
	//rendersliders(si, 0, callback);
};

Editor.update = function () { // for updates that change the time
	if (!Editor.drawing) frame();
};

var frame = function () {
	Editor.updateTime();
	if (Editor.source && Editor.beatmap) {
		Editor.render();
		if (Editor.source.playing) {
			if (Editor.prevt) {
				var from = Editor.beatmap.getIndexAt(Editor.prevt * 1000);
				var to = Editor.beatmap.getIndexAt(Editor.source.t * 1000);
				for (var i = from; i <= to; i++) {
					var obj = Editor.beatmap.HitObjects[i];
					// play sfx
				}
			}
			Editor.prevt = Editor.source.t;
			Editor.drawing = true;
			window.requestAnimationFrame(frame);
		} else {
			Editor.drawing = false;
			Editor.prevt = false;
		}
	}
};

$(window).on("resize", function () {
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
	Editor.update();
});

$(document).ready(function main() {
	Editor.options = {
		timelinezoom: 1,
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
	Editor.selected = [];
	Editor.rendered = new Set();

	$("#menubar>div").mouseover(function () {
		var a = $(this).offset();
		a.top += 18;
		$(this).find(".dropdown").offset(a);
	});

	Editor.getCurObj = function () {
		var temp, clicked, t = Editor.source.t * 1000;
		var rendered = [...Editor.rendered];
		if (isMouseinElement('#timeline2')) {
			var timeline = $('#timeline2'),
				dx = (page_mouseX - timeline.offset().left - timeline.width() / 2),
				pxps = timeline.width() / 8 * Editor.options.timelinezoom,
				mouset = t / 1000 + dx / pxps;
			var x2 = page_mouseX - timeline.offset().left,
				y2 = page_mouseY - timeline.offset().top;
			for (var obj of Editor.selected) {
				var xpos = pxps * (obj.startTime - t) / 1000 + timeline.width() / 2;
				if(Math.sqrt(Math.pow(x2 - xpos, 2) + Math.pow(y2 - timeline.height() / 2, 2)) <= timeline.height() * 0.4) return obj;
				if (obj instanceof Slider || obj instanceof Spinner) {
					var xpos2 = pxps * (obj.endTime - t) / 1000 + timeline.width() / 2;
					if (Math.sqrt(Math.pow(x2 - xpos2, 2) + Math.pow(y2 - timeline.height() / 2, 2)) <= timeline.height() * 0.4) return obj;
					if (x2 >= xpos && x2 <= xpos2) return obj;
				}
			}
			var minD = Infinity, minI;
			for (var i = 0; i < rendered.length; i++) {
				var obj = rendered[i];
				var d = Math.abs(obj.startTime / 1000 - mouset);
				if (obj instanceof Slider || obj instanceof Spinner) {
					if (mouset > obj.startTime / 1000 && mouset < obj.endTime / 1000) return obj;
					d = Math.min(d, Math.abs(obj.endTime / 1000 - mouset));
				}
				if (d < minD) {
					minD = d;
					minI = i;
				}
			}
			clicked = rendered[minI];
			var xpos = pxps * (clicked.startTime - t) / 1000 + timeline.width() / 2;
			if (Math.sqrt(Math.pow(x2 - xpos, 2) + Math.pow(y2 - timeline.height() / 2, 2)) <= timeline.height() * 0.4) return clicked;
			if (clicked instanceof Slider || clicked instanceof Spinner) {
				var xpos2 = pxps * (clicked.endTime - t) / 1000 + timeline.width() / 2;
				if (Math.sqrt(Math.pow(x2 - xpos2, 2) + Math.pow(y2 - timeline.height() / 2, 2)) <= timeline.height() * 0.4) return clicked;
				if (x2 >= xpos && x2 <= xpos2) return clicked;
			}
			return undefined;
		} else {
			rendered.sort(function (a, b) {
				var dta = a.startTime - t,
					dtb = b.startTime - t;
				if (a instanceof Slider && Math.abs(dta) < Math.abs(a.endTime - t)) dta = a.endTime - t;
				if (b instanceof Slider && Math.abs(dtb) < Math.abs(b.endTime - t)) dtb = b.endTime - t;
				if (Math.abs(Math.abs(dta) - Math.abs(dtb)) == 1) dta = Math.sign(dta) * dtb;
				if (dta == -dtb) return dta;
				return Math.abs(b.startTime - t) - Math.abs(a.startTime - t);
			});
			var ar = ars(Editor.beatmap.ApproachRate);
			var cs = cspx(Editor.beatmap.CircleSize);
			var objsToCheck = Editor.selected.concat(rendered);
			for (var i = objsToCheck.length - 1; i >= 0; i--) {
				var obj = objsToCheck[i];
				var td = (obj.startTime - t) / 1000;
				
				if (td > ar || (obj instanceof HitCircle && td < -obj.fadetime) || (obj instanceof Slider && t > obj.endTime / 1000 + 0.8) || obj instanceof Spinner) continue;
				if (obj instanceof HitCircle || (Editor.rendered.has(obj) && Editor.selected.indexOf(obj) != -1)) {
					if (obj.position.distanceTo(new Vector(mouseX, mouseY)) <= cs / 2) {
						clicked = obj;
						break;
					}
				} else if (obj instanceof Slider) {
					var height = $(window).height() * 0.75;
					var width = height * 4 / 3;
					var ctx2 = document.getElementById('gridcanvas2').getContext('2d');
					ctx2.save();
					ctx2.translate(($(window).width() - width) / 2, $(window).height() * 0.16);
					ctx2.scale(width / 512, height / 384);
					ctx2.lineWidth = cs * 11 / 12;
					ctx2.lineJoin = 'round';
					ctx2.lineCap = 'round';
					if (!obj.path) {
						ctx2.beginPath();
						for (var j = 0; j < obj.spline.length; j++) {
							ctx2.lineTo(obj.spline[j][0], obj.spline[j][1]);
						}
						temp = ctx2.isPointInStroke(page_mouseX, page_mouseY - $('#gridcanvas2').offset().top);
					} else
						temp = ctx2.isPointInStroke(obj.path, page_mouseX, page_mouseY - $('#gridcanvas2').offset().top);
					ctx2.restore();
					if (temp) {
						clicked = obj;
						break;
					}
				}
			}
		}
		return clicked;
	};

	Editor.deleteSelected = function () { // CURRENTLY WHEN STUFF GETS DELETED COMBOS GET MESSED UP, CALLING init() CAN BE A TEMPORARY FIX
		for (var j = 0; j < Editor.selected.length; j++) {
			Editor.beatmap.HitObjects.splice(Editor.beatmap.HitObjects.indexOf(Editor.selected[j]), 1);
			// collabTODO
		}
		Editor.selected = [];
	};

	document.addEventListener("contextmenu", function (e) { // right click handling
		e.preventDefault();
		var clicked = Editor.getCurObj();
		var i = Editor.selected.indexOf(clicked);
		if (i != -1) {
			Editor.deleteSelected();
		} else { // SEE LINE 415
			Editor.beatmap.HitObjects.splice(Editor.beatmap.HitObjects.indexOf(clicked), 1);
			// collabTODO
		}
		var o = (e.srcElement || e.originalTarget);
		if (o.matches('#righttoolbar img, #lefttoolbar img, #timeline1c, #playcontrols img')) {
			var ev = document.createEvent('HTMLEvents');
			ev.initEvent('click', true, false);
			o.dispatchEvent(ev);
		}
	});

	$('#gridcanvas2, #grid').dblclick(function (e) { // clicks in play area
		var clicked = Editor.getCurObj();
		if (clicked) Editor.source.t = clicked.startTime / 1000;
		// handle slider end/edge editing one day
	});

	var timelinemove = function (e) {
		if (!Editor.source) return;
		var track = $('#timelinetrack');
		var w = track.width();
		var pct = Math.max(0, Math.min(page_mouseX - track.position().left, w)) / w;
		var pos = pct * Editor.source.duration;
		if (pct >= 1) Editor.source.pause(Editor.source.duration);
		else
			Editor.source.seek(pos);
		Editor.update();
	};

	Editor.deselectAll = function () {
		for (var i = 0; i < Editor.selected.length; i++) {
			Editor.selected[i].selected = false;
		}
		Editor.selected = [];
	};

	var edit_mousedown = false,
		selected_offsetx = 0,
		selected_offsety = 0,
		drag_startx = 0,
		drag_starty = 0,
		selectedi = 0;
	$('#gridcanvas2, #grid').mousedown(function (e) { // clicks in play area
		if (!Editor.beatmap) return;
		edit_mousedown = true;
		if (Editor.options.tool === 0) {
			var clicked = Editor.getCurObj();
			if (clicked) {
				clicked.selected = true;
				selected_offsetx = mouseX - clicked.position.x;
				selected_offsety = mouseY - clicked.position.y;
			}
			i = Editor.selected.indexOf(clicked);
			if (i != -1) {
				selectedi = i;
				return;
			}
			if (!e.ctrlKey || !clicked) {
				Editor.deselectAll();
				if (clicked) Editor.selected = [clicked];
			} else {
				Editor.selected.push(clicked);
			}
			selectedi = Editor.selected.length - 1;
		}
		Editor.renderupdate();
	});

	var timeline2_mousedown = false,
		drag_startt = 0;
	$('#timeline2').mousedown(function (e) {
		if (!Editor.beatmap) return;
		timeline2_mousedown = true;
		$('#lefttoolbar img').removeClass('button_selected');
		$('#draw_select').addClass('button_selected');
		Editor.options.tool = 0;
		var clicked = Editor.getCurObj();
		if (clicked) {
			clicked.selected = true;
			selected_offsetx = mouseX - clicked.position.x;
		}
		i = Editor.selected.indexOf(clicked);
		if (i != -1) {
			selectedi = i;
			return;
		}
		if (!e.ctrlKey || !clicked) {
			Editor.deselectAll();
			if (clicked) Editor.selected = [clicked];
		} else {
			Editor.selected.push(clicked);
		}
		selectedi = Editor.selected.length - 1;
		Editor.renderupdate();
	});

	var timeline_mousedown = false;
	$('#timeline1c').mousedown(function (e) {
		timeline_mousedown = true;
		timelinemove(e);
	});

	$(document).mouseup(function () {
		timeline_mousedown = false;
		edit_mousedown = false;
		timeline2_mousedown = false;
	});

	var snap_grid = function (n) {
		var d = Editor.options.gridsnap ? Math.pow(2, Editor.options.gridlevel + 1) : 1;
		return Math.round(n / d) * d;
	};

	Editor.updateMouseLocation = function () {
		var height = $(window).height() * 0.75;
		var width = height * 4 / 3;
		var prevmouseX = mouseX,
			prevmouseY = mouseY;
		mouseX = (page_mouseX - $('#grid').offset().left) / width * 512;
		mouseY = (page_mouseY - $('#grid').offset().top) / height * 384;
		snapped_mouseX = snap_grid(mouseX);
		snapped_mouseY = snap_grid(mouseY);

		if (timeline_mousedown)
			timelinemove(e);
		else if (edit_mousedown && Editor.selected.length > 0) {
			var newx = Math.min(512, Math.max(0, snap_grid(mouseX - selected_offsetx)));
			var newy = Math.min(384, Math.max(0, snap_grid(mouseY - selected_offsety)));
			var dx = newx - Editor.selected[selectedi].position.x,
				dy = newy - Editor.selected[selectedi].position.y;
			for (var i = 0; i < Editor.selected.length; i++) {
				var obj = Editor.selected[i];
				var serialized = obj.serialize();
				if (obj instanceof Slider) {
					for (var j = 1; j < obj.points.length; j++) {
						obj.points[j].x += dx;
						obj.points[j].y += dy;
					}
					if (obj.cache && obj.cache.render) {
						obj.cache.render[1][0] += dx;
						obj.cache.render[1][1] += dy;
					}
					obj.calculate();
				}
				obj.position.x += dx;
				obj.position.y += dy;

				// collabTODO
				Editor.socket.edit_move(serialized, obj.position.x, obj.position.y);
			}
		} else { }
		Editor.renderupdate();

		if (Editor.selected.length > 0) {
			$('#mousepos').html('x:' + Editor.selected[selectedi].position.x + ' y:' + Editor.selected[selectedi].position.y);
		} else {
			$('#mousepos').html('x:' + snapped_mouseX + ' y:' + snapped_mouseY);
		}
	};

	var captureMouseLocation = function (e) {
		page_mouseX = e.pageX;
		page_mouseY = e.pageY;
		Editor.updateMouseLocation();
	};

	var wheelupdate = function (e) {
		if (e.altKey) {
			if (isMouseinElement('#grid'))
				Editor.options.distancespacing = Math.min(6, Math.max(0.1, Editor.options.distancespacing + (e.wheelDelta || -e.detail) / 1200));
			else if (isMouseinElement('#timeline2'))
				Editor.options.timelinezoom = Math.min(8, Math.max(0.4, Editor.options.timelinezoom + (e.wheelDelta || -e.detail) / 1200));
			else if (Editor.source)
				Editor.source.volume = Math.min(2, Math.max(0, Editor.source.volume + (e.wheelDelta || -e.detail) / 2400));
		} else if (e.ctrlKey) {
			e.preventDefault();
			Editor.options.beatsnapdivisor = Math.min(16, Math.max(1, Math.floor(Editor.options.beatsnapdivisor * Math.pow(2, (e.wheelDelta || -e.detail) / 120))));
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
			Editor.update();
		}
	};

	document.addEventListener("mousemove", captureMouseLocation, false);
	document.addEventListener("mousewheel", wheelupdate);

	var controlclicked = function (elem) {
		elem.removeClass("scalable");
		setTimeout(function () {
			elem.addClass("scalable");
		}, 40);
	};

	$('#editorplay').click(function () {
		if (Editor.source) {
			if (Editor.source.playing) Editor.source.play(0);
			else Editor.source.play();
			Editor.update();
		}
		controlclicked($(this));
	});

	$('#editorpause').click(function () {
		if (Editor.source) {
			if (Editor.source.playing) Editor.source.pause();
			else {
				Editor.source.play();
				Editor.update();
			}
		}
		controlclicked($(this));
	});

	$('#editorstop').click(function () {
		if (Editor.source)
			Editor.source.pause(0);
		controlclicked($(this));
	});

	$('#fullscreen').click(toggleFullScreen);

	$('#zoomin').click(function () {
		Editor.options.timelinezoom = Math.min(8, Editor.options.timelinezoom + 0.1);
		Editor.update();
	});

	$('#zoomout').click(function () {
		Editor.options.timelinezoom = Math.max(0.4, Editor.options.timelinezoom - 0.1);
		Editor.update();
	});

	$('#righttoolbar img').click(function () {
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

	$('#lefttoolbar img').click(function () {
		$('#lefttoolbar img').removeClass('button_selected');
		$(this).addClass('button_selected');
		Editor.options.tool = $(this).index();
	});

	var keypresshandler = function (e) {
		var data;
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
				data = 'hi';
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
				data = 'hi';
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
		} else if (code == 37 || code == 39) { //left & right

			if (Editor.source) {
				var tpt = Editor.beatmap.getTimingPoint(Editor.source.t * 1000);
				var pos = Editor.source.t + (code == 37 ? -1 : 1) * tpt.beatLength / 1000 / (Editor.source.playing ? 1 : Editor.options.beatsnapdivisor) * (e.shiftKey ? 4 : 1);
				tpt = Editor.beatmap.getTimingPoint(pos * 1000);
				if (!Editor.source.playing)
					pos = snap(pos, tpt.baseOffset / 1000, tpt.beatLength / 1000 / Editor.options.beatsnapdivisor);
				Editor.source.seek(pos);
			}
		} else if (code == 46) { //delete
			Editor.deleteSelected();
		} else if (code == 49) { //1
			if (e.ctrlKey) {
				Editor.setGridLevel(1);
			} else if (Editor.options.tool !== 0) {
				$('#lefttoolbar img').removeClass('button_selected');
				$('#draw_select').addClass('button_selected');
				Editor.options.tool = 0;
			}
		} else if (code == 50) { //2
			if (e.ctrlKey) {
				Editor.setGridLevel(2);
			} else if (Editor.options.tool != 1) {
				$('#lefttoolbar img').removeClass('button_selected');
				$('#draw_normal').addClass('button_selected');
				Editor.options.tool = 1;
				Editor.deselectAll();
			}
		} else if (code == 51) { //3
			if (e.ctrlKey) {
				Editor.setGridLevel(3);
			} else if (Editor.options.tool != 2) {
				$('#lefttoolbar img').removeClass('button_selected');
				$('#draw_slider').addClass('button_selected');
				Editor.options.tool = 2;
				Editor.deselectAll();
			}
		} else if (code == 52) { //4
			if (e.ctrlKey) {
				Editor.setGridLevel(4);
			} else if (Editor.options.tool != 3) {
				$('#lefttoolbar img').removeClass('button_selected');
				$('#draw_spinner').addClass('button_selected');
				Editor.options.tool = 3;
				Editor.deselectAll();
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
		Editor.update();
	};

	var keyuphandler = function (e) {
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
	Skin.LoadSkin('Default', function (skin) {
		Editor.skin = skin;
		Editor.audioCtx = new AudioContext();
		Editor.socket = new Socket();
		Editor.align();
		Editor.update();
	});
});
