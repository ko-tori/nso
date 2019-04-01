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

window.onbeforeunload = function() {
	if (Editor.roomID && Editor.source) {
		localStorage.setItem(Editor.roomID + 't', Editor.source.t);
		localStorage.setItem(Editor.roomID + 'v', Editor.source.volume);
	}
};

var toggleFullScreen = function () {
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

function fullscreenHandler() {
	console.log('derp?');
	var el = document.getElementById('fullscreen');
	el.src = el.src.endsWith("/stuff/editor-fullscreen.png") ? "/stuff/editor-unfullscreen.png" : "/stuff/editor-fullscreen.png";
}

document.addEventListener('webkitfullscreenchange', fullscreenHandler, false);
document.addEventListener('mozfullscreenchange', fullscreenHandler, false);
document.addEventListener('fullscreenchange', fullscreenHandler, false);
document.addEventListener('MSFullscreenChange', fullscreenHandler, false);

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
	Editor.timeline_rendered = new Set();
	var timeline = $('#timeline2');
	var tctx = document.getElementById('timeline2').getContext('2d'),
		width = tctx.canvas.width,
		height = tctx.canvas.height;
	tctx.clearRect(0, 0, width, height);
	tctx.save();
	var [renderFrom, renderTo] = Editor.mapUtils.timelineRenderRange();
	var flag = Editor.timeline2_mousedown && Editor.timeline2_objend;
	for (var i = renderTo; i >= renderFrom; i--) {
		var obj = Editor.beatmap.HitObjects[i];
		if (!(Editor.timeline2_mousedown && ! Editor.timeline2_objend) &&
			(Editor.selected.length < 2 && (obj instanceof Slider || obj instanceof Spinner))) {
			let t = Editor.source.t * 1000,
				x = page_mouseX - timeline.offset().left,
				y = page_mouseY - timeline.offset().top,
				pxps = timeline.width() / 6 * Editor.options.timelinezoom,
				x2 = pxps * (obj.endTime - t) / 1000 + timeline.width() / 2;
			if (Math.abs(x - x2) < timeline.height() * 0.1 && Math.abs(y - timeline.height() / 2) <= timeline.height() * 0.4) {
				timeline.css('cursor', 'e-resize');
				//console.log(Editor.timeline2_objend, Editor.timeline2_mousedown);
				flag = true;
				Editor.timeline2_objend = true;
			}
		}
		var a;
		try {
			a = obj.timelineRender();
		}
		catch (e) {
			console.log(e);
		}
		if (a)
			Editor.timeline_rendered.add(Editor.beatmap.HitObjects[i]);
	}
	if (!flag) {
		timeline.css('cursor', 'auto');
		Editor.timeline2_objend = false;
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
		lbound = t - 3 / Editor.options.timelinezoom,
		rbound = t + 3 / Editor.options.timelinezoom,
		beat1 = lbound - mod(lbound - tpt.baseOffset / 1000, beatl * tpt.timingSignature),
		beat1pos = ((beat1 - t) * Editor.options.timelinezoom / 6 + .5) * width;

	// measure bars
	tctx.beginPath();
	for (var x = beat1pos; x < width; x += beatl * tpt.timingSignature * Editor.options.timelinezoom / 6 * width) {
		tctx.moveTo(x, height * 0.6);
		tctx.lineTo(x, height - 3);
	}
	tctx.stroke();

	x = 0;
	for (var i = 0; x < width; i++) {
		var j = i % d, yfrom;
		x = beat1pos + i * beatl * Editor.options.timelinezoom / 6 * width / d;

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
    var timeline = $('#timeline2');
	if (Editor.timeline2_dragging) {
		tctx.save();
		tctx.fillStyle = '#FFF';
		tctx.globalAlpha = 0.3;
		let x1 = ((Editor.drag_startt - t) * Editor.options.timelinezoom / 6 + .5) * width,
			x2 = (page_mouseX - timeline.offset().left);
		tctx.fillRect(x1, 0, x2 - x1, height - 3);
		tctx.restore();
	}
};

Editor.render = function () {
	//timeline rendering
	Editor.renderTimeline();

    //object rendering
    Editor.playfield_rendered = new Set();
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
			Editor.playfield_rendered.add(Editor.beatmap.HitObjects[i]);
	}

	//selected objects
	ctx.globalAlpha = 1;
	for (i = 0; i < Editor.selected.length; i++) {
		if(!(Editor.selected[i] instanceof Spinner))
			ctx.drawImage(Editor.skin.hitcircleselect, Editor.selected[i].position.x - cs / 2, Editor.selected[i].position.y - cs / 2, cs, cs);
		if(Editor.selected[i] instanceof Slider)
			ctx.drawImage(Editor.skin.hitcircleselect, Editor.selected[i].endPosition.x - cs / 2, Editor.selected[i].endPosition.y - cs / 2, cs, cs);
	}

	//drag area
	if (Editor.edit_dragging) {
		ctx2.fillStyle = 'rgba(255,255,255,0.2)';
		ctx2.strokeStyle = '#FFF';
		ctx2.lineWidth = 0.5;
		ctx2.beginPath();
		ctx2.rect(Editor.drag_startx, Editor.drag_starty, mouseX - Editor.drag_startx, mouseY - Editor.drag_starty);
		ctx2.fill();
		ctx2.stroke();
	} else {
		//hovered objects
		ctx2.lineWidth = cs * 11 / 12;
		ctx2.lineJoin = 'round';
		ctx2.lineCap = 'round';
		Editor.sliderpt_hovered = false;
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
				//ctx.restore();
				//ctx2.restore();
				break;
			}
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
};

var copyStringFromObjects = function(objs) {
	objs.sort(function(a, b) {
		return a.startTime - b.startTime;
	});
	var ret = msToTimeString(objs[0].startTime) + " (";
	for (var i = 0; i < objs.length; i++) {
		ret += Editor.objc[Editor.beatmap.HitObjects.indexOf(Editor.selected[i])][1];
		if (i < objs.length - 1) ret += ",";
	}
	return ret + ") - ";
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

var msToTimeString = function(t) {
	return new Date(Math.round(t)).toISOString().substr(14, 9).replace('.', ':');
};

Editor.updateTime = function() {
	var t = Editor.source ? Math.min(Editor.source.t, Editor.source.duration) : 0;
	var pct = Editor.source ? t / Editor.source.duration : 0;
	var rounded = (pct * 100).toFixed(1);
	$('#time').html(msToTimeString(t * 1000));
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
	Editor.mapUtils = new Editor.MapUtils(Editor.beatmap);
	var breaks = Editor.beatmap.breakTimes,
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
	for (i = 0; i < Editor.beatmap.HitObjects.length; i++) {
		if (i === 0 || (Editor.beatmap.HitObjects[i].newCombo)) {
			if (j > maxc) {
				maxc = j;
			}
			n++;
			if (!(Editor.beatmap.HitObjects[i] instanceof Spinner))
				n += Editor.beatmap.HitObjects[i].customColor;
			j = 1;
		}
		Editor.objc.push([n, j]);
		j++;
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

	Editor.maxsliderdur = 0;
	for (i = 0; i < Editor.beatmap.HitObjects.length; i++) {
		if (Editor.beatmap.HitObjects[i] instanceof Slider) {
			if (Editor.beatmap.HitObjects[i].duration / 1000 > Editor.maxsliderdur)
				Editor.maxsliderdur = Editor.beatmap.HitObjects[i].duration / 1000;
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
	Editor.updateMouseLocation();
	Editor.update();
	//setTimeout(function(){renderslidersasync(si, 10, function(){console.log('sliders done')})}, 0); //async
	//rendersliders(si, 0, callback);
};

Editor.update = function () { // for updates that change the time
	if (!Editor.drawing) frame();
};

Editor.loadSkin = function(name) {
	Skin.LoadSkin(name, function (skin) {
		Editor.skin = skin;
		Editor.init();
	});
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
	Editor.timeline_rendered = new Set();
	Editor.playfield_rendered = new Set();

	$("#menubar>div").mouseover(function () {
		var a = $(this).offset();
		a.top += 18;
		$(this).find(".dropdown").offset(a);
	});

	Editor.getCurObj = function () {
		var temp, clicked, t = Editor.source.t * 1000;
		if (isMouseinElement('#timeline2')) {
			var rendered = [...Editor.timeline_rendered];
			var timeline = $('#timeline2'),
				dx = (page_mouseX - timeline.offset().left - timeline.width() / 2),
				pxps = timeline.width() / 6 * Editor.options.timelinezoom,
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
			if (typeof clicked == "undefined") return clicked;
			var xpos = pxps * (clicked.startTime - t) / 1000 + timeline.width() / 2;
			if (Math.sqrt(Math.pow(x2 - xpos, 2) + Math.pow(y2 - timeline.height() / 2, 2)) <= timeline.height() * 0.4) return clicked;
			if (clicked instanceof Slider || clicked instanceof Spinner) {
				var xpos2 = pxps * (clicked.endTime - t) / 1000 + timeline.width() / 2;
				if (Math.sqrt(Math.pow(x2 - xpos2, 2) + Math.pow(y2 - timeline.height() / 2, 2)) <= timeline.height() * 0.4) return clicked;
				if (x2 >= xpos && x2 <= xpos2) return clicked;
			}
			return undefined;
		} else {
			var rendered = [...Editor.playfield_rendered];
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
			var objsToCheck = rendered.concat(Editor.selected);
			for (var i = objsToCheck.length - 1; i >= 0; i--) {
				var obj = objsToCheck[i];
				var td = (obj.startTime - t) / 1000;
				
				if (obj instanceof Spinner) continue;
				if (obj instanceof HitCircle || Editor.selected.indexOf(obj) != -1 && !Editor.playfield_rendered.has(obj)) {
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

	Editor.select = function (x) {
		if (x instanceof HitObject) {
			x.selected = true;
			Editor.selected.push(x);
		} else if (x instanceof Array) {
			x.forEach((obj) => {
				obj.selected = true;
			});
			Editor.selected = Editor.selected.concat(x);
		}
	};

	Editor.deselectAll = function () {
		for (var i = 0; i < Editor.selected.length; i++) {
			Editor.selected[i].selected = false;
		}
		Editor.selected = [];
	};

	Editor.setSelection = function (arr) {
		Editor.deselectAll();
		Editor.select(arr);
	};

	var mousemoved = false,
		edit_mousedown = false,
		selected_offsetx = 0, // offset of the mouse position to the actual position of the primary selected object
		selected_offsety = 0,
		selectedi = 0, // index in Editor.selected of the primary selected item
		selectedparts = 0; // bit flag for what part(s) of the selected object is selected
	Editor.edit_dragging = false,
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
				else {
					Editor.edit_dragging = true;
					Editor.drag_startx = mouseX;
					Editor.drag_starty = mouseY;
				}
			} else {
				Editor.selected.push(clicked);
			}
			selectedi = Editor.selected.length ? Editor.selected.length - 1 : 0;
		}
		Editor.renderupdate();
	});

	var selected_offsett = 0;
	Editor.timeline2_mousedown = false;
	Editor.drag_startt = 0;
	Editor.timeline2_dragging = false,
	Editor.timeline2_objend = false;
	Editor.scroll_interval = false;
	$('#timeline2').mousedown(function (e) {
		if (!Editor.beatmap) return;
		Editor.timeline2_mousedown = true;
		$('#lefttoolbar img').removeClass('button_selected');
		$('#draw_select').addClass('button_selected');
		Editor.options.tool = 0;
		var $this = $(this);
		var dx = (page_mouseX - $this.offset().left - $this.width() / 2),
			pxps = $this.width() / 6 * Editor.options.timelinezoom,
			time_clicked = Editor.source.t + dx / pxps;
		var clicked = Editor.getCurObj();
		if (clicked) {
			clicked.selected = true;
			selected_offsett = time_clicked - (Editor.timeline2_objend ? clicked.endTime / 1000 : clicked.startTime / 1000);
		}
		i = Editor.selected.indexOf(clicked);
		if (i != -1) {
			selectedi = i;
			return;
		}
		if (!e.ctrlKey || !clicked) {
			Editor.deselectAll();
			if (clicked) Editor.selected = [clicked];
			else {
				Editor.timeline2_dragging = true;
				Editor.drag_startt = time_clicked;
			}
		} else {
			Editor.selected.push(clicked);
		}
		selectedi = Editor.selected.length ? Editor.selected.length - 1 : 0;
		Editor.renderupdate();
	});

	var timeline_mousedown = false;
	$('#timeline1c').mousedown(function (e) {
		timeline_mousedown = true;
		timelinemove(e);
	});

	$(document).mouseup(function () {
		if (mousemoved) Editor.updateMouseLocation();
		mousemoved = false;
		timeline_mousedown = false;
		edit_mousedown = false;
		Editor.edit_dragging = false;
		Editor.timeline2_mousedown = false;
		Editor.timeline2_dragging = false;
		Editor.renderupdate();
	});

	var snap_grid = function (n) {
		var d = Editor.options.gridsnap ? Math.pow(2, Editor.options.gridlevel + 1) : 1;
		return Math.round(n / d) * d;
	};

	var snap_beat = function (t) {
		var tpt = Editor.beatmap.getTimingPoint(t * 1000);
		return snap(t, tpt.baseOffset / 1000, tpt.beatLength / 1000 / Editor.options.beatsnapdivisor);
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
		else if (edit_mousedown) {
			if(Editor.edit_dragging) {
				let [minx, maxx] = mouseX > Editor.drag_startx ? [Editor.drag_startx, mouseX] : [mouseX, Editor.drag_startx];
				let [miny, maxy] = mouseY > Editor.drag_starty ? [Editor.drag_starty, mouseY] : [mouseY, Editor.drag_starty];
				Editor.setSelection([...Editor.playfield_rendered].filter((o) => {
					return o.position.x >= minx && o.position.x <= maxx && o.position.y >= miny && o.position.y <= maxy;
				}));
			} else {
				var newx = Math.min(512, Math.max(0, snap_grid(mouseX - selected_offsetx)));
				var newy = Math.min(384, Math.max(0, snap_grid(mouseY - selected_offsety)));
				// add more stuff to keep the whole selection in the play area
				var dx = newx - Editor.selected[selectedi].position.x,
				dy = newy - Editor.selected[selectedi].position.y;
				
				for (var i = 0; i < Editor.selected.length; i++) {
					let obj = Editor.selected[i];
					Editor.MapUtils.moveObject(Editor.selected[i], dx, dy);
					Editor.socket.edit_move(obj.id, obj.position.x, obj.position.y);
				}
			}
		} else if (Editor.timeline2_mousedown) {
			var timeline = $('#timeline2'),
				dx = (page_mouseX - timeline.offset().left - timeline.width() / 2),
				pxps = timeline.width() / 6 * Editor.options.timelinezoom,
				mouseT = Editor.source.t + dx / pxps;
				if (Editor.timeline2_dragging) {
				var temp = [];
				let [mint, maxt] = mouseT > Editor.drag_startt ? [Editor.drag_startt, mouseT] : [mouseT, Editor.drag_startt];
				mint *= 1000;
				maxt *= 1000;
				let [mini, maxi] = [mint, maxt].map((i) => { return Editor.beatmap.getIndexAt(i); });
				for (var i = mini; i <= maxi; i++) {
					let o = Editor.beatmap.HitObjects[i];
					if ((o.startTime >= mint && o.startTime <= maxt) || (!(o instanceof HitCircle) && (o.endTime >= mint && o.endTime <= maxt)))
						temp.push(o);
				}
				Editor.setSelection(temp);
			} else if (selectedi in Editor.selected) {
				if (Editor.selected.length < 2 && Editor.timeline2_objend) {
					var obj = Editor.selected[selectedi];
					if (obj instanceof Spinner) {
						var newt = snap_beat(Math.min(Editor.source.duration, Math.max(0, mouseT - selected_offsett))) * 1000;
						if (newt > obj.startTime + 1) {
							obj.endTime = newt;
							obj.duration = obj.endTime - obj.startTime;
						}
						//collab todo
						//Editor.socket.durationchange(?);
					} else if (obj instanceof Slider) {
						var newr = Math.round((mouseT - selected_offsett) * 1000 / obj.duration);
						var newt = newr * obj.duration;
						newt = Math.min(Editor.source.duration, Math.max(0, mouseT - selected_offsett));
						if (newt > obj.startTime + 1 && newt != obj.endTime) {
							obj.endTime = newt;
							obj.duration = obj.endTime - obj.startTime;
							obj.repeatCount = newr;
						}
					}	
				} else {
					var newt = snap_beat(Math.min(Editor.source.duration, Math.max(0, mouseT - selected_offsett)));
					var dt = newt - Editor.selected[selectedi].startTime / 1000;
					for (let i = 0; i < Editor.selected.length; i++) {
						let obj = Editor.selected[i];
						let serialized = obj.serialize();
						if (obj instanceof Slider || obj instanceof Spinner)
							obj.endTime += dt * 1000;
						obj.startTime += dt * 1000;
						// IMPORTANT: CHANGE THE ORDER OF STUFF IN beatmap.HitObjects !!!!! TODO!!!!!
						// collabTODO
						//Editor.socket.edit_movet(serialized, obj.startTime);
					}
				}
			}
			function isTimelineScroll() {
				return Editor.timeline2_mousedown && !Editor.source.playing && (page_mouseX < timeline.offset().left || page_mouseX > timeline.offset().left + timeline.width());
			}
			if (isTimelineScroll() && !Editor.scroll_interval) {
				Editor.scroll_interval = setInterval(function() {
					if (!isTimelineScroll()) {
						clearInterval(Editor.scroll_interval);
						Editor.scroll_interval = false;
					} else {
						let n = page_mouseX - timeline.offset().left - timeline.width() / 2; // mousex relative to center of timeline
						n -= Math.sign(n) * timeline.width() / 2; // change n so it is a measure of how far outside the timeline it is
						if (n > 2 * timeline.offset().left) n = 2 * timeline.offset().left; // right side caps distance at 2x the length of the left (arbitrary)
						Editor.source.t = Math.max(0, Math.min(Editor.source.duration, Editor.source.t + n / 6 / Math.pow(6 + Editor.options.timelinezoom, 2)));
						Editor.updateTime();
						Editor.renderupdate();
					}
				}, 10);
			}
		} else { }
		Editor.renderupdate();

		var tempx, tempy;
		if (Editor.sliderpt_hovered) {
			tempx = Editor.sliderpt_hovered.x, tempy = Editor.sliderpt_hovered.y;
		} else if (Editor.selected.length > 0) {
			tempx = Editor.selected[selectedi].position.x, tempy = Editor.selected[selectedi].position.y;
		} else {
			tempx = snapped_mouseX, tempy = snapped_mouseY;
		}
		$('#mousepos').html('x:' + tempx + ' y:' + tempy);
	};

	var captureMouseLocation = function (e) {
		if (page_mouseX == e.pageX && page_mouseY == e.pageY) return;
		if (timeline_mousedown || edit_mousedown || Editor.timeline2_mousedown) mousemoved = true;
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
				Editor.source.volume = Math.min(1, Math.max(0, Editor.source.volume + (e.wheelDelta || -e.detail) / 2400));
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
				Editor.updateMouseLocation();
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
		}
		if (!keyMap[18] && code == 18) {
			$('#draw_distsnap').toggleClass('button_selected');
			Editor.options.distancesnap = !Editor.options.distancesnap;
		}
		keyMap[code] = true;
		if ((code == 67 || code == 32) && Editor.source) { //c, space
			if (code == 67 && e.ctrlKey) { //ctrl-c
				if (Editor.selected.length > 0) {
					data = copyStringFromObjects(Editor.selected);
					copyTextToClipboard(data);
					Editor.copyData = data;
					console.log('copied: ' + data);
				} else {
					console.log('nothing copied!');
				}
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
			if (e.ctrlKey && Editor.selected) {
				let dx = code == 37 ? -1 : 1;
				if (Editor.options.gridsnap) {
					dx *= Math.pow(2, Editor.options.gridlevel + 1);
				}
				if (Editor.selected.some(obj => obj.position.x + dx < 0 || obj.position.x > 512))
					return;
				for (var i = 0; i < Editor.selected.length; i++) {
					let obj = Editor.selected[i];
					Editor.MapUtils.moveObject(Editor.selected[i], dx, 0);
					Editor.socket.edit_move(obj.id, obj.position.x, obj.position.y);
				}
			} else if (Editor.source) {
				var tpt = Editor.beatmap.getTimingPoint(Editor.source.t * 1000);
				var pos = Editor.source.t +
					(code == 37 ? -1 : 1) * tpt.beatLength / 1000 / (Editor.source.playing ? 1 :
					Editor.options.beatsnapdivisor) * (e.shiftKey ? 4 : 1);
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
		} else if (code == 89) { //y
			$('#draw_distsnap').toggleClass('button_selected');
			Editor.options.distsnap = !Editor.options.distsnap;
		} else if (code == 76) { //l
			$('#draw_lock').toggleClass('button_selected');
			Editor.options.locknotes = !Editor.options.locknotes;
		} else if (code == 71) { //g
			Editor.setGridLevel(Editor.options.gridlevel % 4 + 1);
		} else if (code == 70) { //f
			toggleFullScreen();
		} else if (code == 65) { //a
			if (e.ctrlKey)
				Editor.setSelection(Editor.beatmap.HitObjects);
		}
		Editor.updateMouseLocation();
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
			Editor.updateMouseLocation();
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
