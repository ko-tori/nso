var Editor = Editor || {};

if (typeof require !== "undefined") {
	Math2 = require("./../Math2");
	Bezier = Math2.Bezier;
	Vector = require("./../Vector");
}

var curveTypes = {
	"C": "catmull",
	"B": "bezier",
	"L": "linear",
	"P": "pass-through",
	"catmull": "C",
	"bezier": "B",
	"linear": "L",
	"pass-through": "P"
};
var additionTypes = [null, "normal", "soft", "drum"];

class HitObject {
	static serializeSoundTypes(array) {
		var number = 0;
		if (array.indexOf("whistle") >= 0) number |= 2;
		if (array.indexOf("finish") >= 0) number |= 4;
		if (array.indexOf("clap") >= 0) number |= 8;
		return number;
	}
	static parseAdditions(str) {
		var additions = {};
		if (!str) return additions;
		var parts = str.split(":");

		if (parts[0] && parts[0] !== "0")
			additions.sample = additionTypes[parseInt(parts[0])];
		if (parts[1] && parts[1] !== "0")
			additions.additionalSample = additionTypes[parseInt(parts[1])];
		if (parts[2] && parts[2] !== "0")
			additions.customSampleIndex = parseInt(parts[2]);
		if (parts[3] && parts[3] !== "0")
			additions.hitsoundVolume = parseInt(parts[3]);
		if (parts[4] && parts[4] !== "0")
			additions.hitsound = parts[4];
		return additions;
	}
	static parse(line) {
		var parts = line.split(",");
		var soundType = parseInt(parts[4]);
		var objectType = parseInt(parts[3]);
		var properties = {};

		properties.originalLine = line;
		properties.startTime = parseInt(parts[2]);
		properties.soundTypes = [];
		properties.newCombo = (objectType & 4) == 4;
		properties.position = new Vector(parseInt(parts[0]), parseInt(parts[1]));

		if ((soundType & 2) == 2) properties.soundTypes.push("whistle");
		if ((soundType & 4) == 4) properties.soundTypes.push("finish");
		if ((soundType & 8) == 8) properties.soundTypes.push("clap");
		if (properties.soundTypes.length == 0) properties.soundTypes.push("normal");

		if ((objectType & 1) == 1) {
			properties.additions = HitObject.parseAdditions(parts[5]);
			return new HitCircle(properties);
		} else if ((objectType & 2) == 2) {
			properties.repeatCount = parseInt(parts[6]);
			properties.pixelLength = parseFloat(parts[7]);
			properties.additions = HitObject.parseAdditions(parts[10]);
			properties.edges = [];
			properties.points = [properties.position];
			var points = (parts[5] || "").split("|");
			if (points.length) {
				properties.curveType = curveTypes[points[0]] || "unknown";
				for (var i = 1; i < points.length; i += 1) {
					var coordinates = points[i].split(":");
					properties.points.push(new Vector(
						parseInt(coordinates[0]),
						parseInt(coordinates[1])
					));
				}
			}
			var edgeSounds = [];
			var edgeAdditions = [];
			if (parts[8]) edgeSounds = parts[8].split("|");
			if (parts[9]) edgeAdditions = parts[9].split("|");

			for (var i = 0; i < properties.repeatCount + 1; i += 1) {
				var edge = {
					"soundTypes": [],
					"additions": HitObject.parseAdditions(edgeAdditions[i])
				};
				if (edgeSounds[i]) {
					var sound = parseInt(edgeSounds[i]);
					if ((sound & 2) == 2) edge.soundTypes.push("whistle");
					if ((sound & 4) == 4) edge.soundTypes.push("finish");
					if ((sound & 8) == 8) edge.soundTypes.push("clap");
					if (edge.soundTypes.length == 0) edge.soundTypes.push("normal");
				} else {
					edge.soundTypes.push("normal");
				}
				properties.edges.push(edge);
			}

			return new Slider(properties);
		} else if ((objectType & 8) == 8) {
			properties.additions = HitObject.parseAdditions(parts[6]);
			return new Spinner(properties);
		}
	}
	constructor(properties) {
		for (var key in properties) {
			this[key] = properties[key];
		}
	}
	serialize() {
		throw "Not implemented.";
	}
	render() {
		throw "Not implemented.";
	}
}

class HitCircle extends HitObject {
	constructor(properties) {
		super(properties);
		this.fadetime = .8;
	}
	serialize() {
		var parts = [];
		parts.push(this.position.x);
		parts.push(this.position.y);
		parts.push(this.startTime);
		parts.push(1 | (this.newCombo ? 4 : 0));
		parts.push(HitObject.serializeSoundTypes(this.soundTypes));
		var additions = [];
		additions.push(this.additions.sample ? additionTypes.indexOf(this.additions.sample) : 0);
		additions.push(this.additions.additionalSample ? additionTypes.indexOf(this.additions.additionalSample) : 0);
		additions.push(this.additions.customSampleIndex ? this.additions.customSampleIndex : 0);
		additions.push(this.additions.hitsoundVolume ? this.additions.hitsoundVolume : 0);
		additions.push("");
		parts.push(additions.join(":"));
		return parts.join(",");
	}

	render(t, colIndex, comboNumber) {
		if (!t) t = Editor.source.t;
		if (!colIndex || !comboNumber) {
			var i = this.beatmap.HitObjects.indexOf(this);
			if (!colIndex) colIndex = Editor.objc[i][0] % Editor.cols.length;
			if (!comboNumber) comboNumber = Editor.objc[i][1];
		}
		var ar = ars(parseFloat(this.beatmap['ApproachRate']));
		var cs = cspx(parseFloat(this.beatmap['CircleSize']));
		var offset = this.startTime / 1000;
		var x = this.position.x - cs / 2,
			y = this.position.y - cs / 2;
		var td = offset - t;
		if (td > ar) return;
		var color = Editor.cols[colIndex];
		var ctx = document.getElementById('gridcanvas').getContext('2d');
		ctx.save();
		if (td > 0) {
			ctx.globalAlpha = 2 - 2 * td / ar;
			var r_as = cs * (2.5 * td / ar + 1);
			ctx.drawImage(Editor.skin['approachcircle' + colIndex], x + cs / 2 - r_as / 2, y + cs / 2 - r_as / 2, r_as, r_as);
			ctx.drawImage(Editor.skin['hitcircle' + colIndex], x, y, cs, cs);
		} else {
			ctx.globalAlpha = Math.max(1 + td / this.fadetime, 0);
			var r_as = cs * Math.min(-td / ar + 1, 13 / 12);
			ctx.drawImage(Editor.skin['approachcircle' + colIndex], x + cs / 2 - r_as / 2, y + cs / 2 - r_as / 2, r_as, r_as);
			ctx.drawImage(Editor.skin['hitcircle'], x, y, cs, cs);
		}

		var drawOverlay = function() {
			ctx.drawImage(Editor.skin.hitcircleoverlay, x, y, cs, cs);
		};
		var drawNumber = function() {
			var num = Editor.skin['default-' + comboNumber];
			var newh = num.height / Editor.skin['hitcircle'].height * cs * 3 / 4;
			var dh = newh / num.height;
			ctx.drawImage(num, x - num.width * dh / 2 + cs / 2, y - newh / 2 + cs / 2, num.width * dh, newh);

		};
		if (parseInt(Editor.skin._meta.options.HitCircleOverlayAboveNumber || Editor.skin._meta.options.HitCircleOverlayAboveNumer, 10)) {
			drawNumber();
			drawOverlay();
		} else {
			drawOverlay();
			drawNumber();
		}
		ctx.restore();
	}
}

class Slider extends HitObject {
	constructor(properties) {
		super(properties);
		this.fadetime = .25;
	}
	static getEndPoint(sliderType, sliderLength, points) {
		if (!sliderType || !sliderLength || !points) return;
		switch (sliderType) {
			case "linear":
				return Math2.pointOnLine(points[0], points[1], sliderLength);
			case "catmull":
				// not supported
				return;
			case "bezier":
				if (!points || points.length < 2)
					return undefined;
				if (points.length == 2) {
					return Math2.pointOnLine(points[0], points[1], sliderLength);
				}
				points = points.slice();
				var bezier, previous, point;
				for (var i = 0, l = points.length; i < l; i += 1) {
					point = points[i];
					if (!point)
						continue;
					if (!previous) {
						previous = point;
						continue;
					}
					if (point.equals(previous)) {
						bezier = new Bezier(points.splice(0, i));
						sliderLength -= bezier.pxLength;
						i = 0, length = points.length;
					}
					previous = point;
				}
				bezier = new Bezier(points);
				return bezier.pointAtDistance(sliderLength);
			case "pass-through":
				if (!points || points.length < 2)
					return undefined;
				if (points.length == 2)
					return Math2.pointOnLine(points[0], points[1], sliderLength);
				if (points.length > 3)
					return Slider.getEndPoint("bezier", sliderLength, points);
				var [circumCenter, radius] = Math2.getCircumCircle(points[0], points[1], points[2]);
				var radians = sliderLength / radius;
				if (Math2.isLeft(points[0], points[1], points[2]))
					radians *= -1;
				return Math2.rotate(circumCenter, points[1], radians);
		}
	}
	calculate() {
		var timing = this.beatmap.getTimingPoint(this.startTime);
		if (timing) {
			var pxPerBeat = this.beatmap.SliderMultiplier * 100 * timing.velocity;
			var beatsNumber = (this.pixelLength * this.repeatCount) / pxPerBeat;
			this.duration = Math.ceil(beatsNumber * timing.beatLength);
			this.endTime = this.startTime + this.duration;
		}
		var endPoint = Slider.getEndPoint(this.curveType, this.pixelLength, this.points);
		if (endPoint) {
			this.endPosition = endPoint;
		} else {
			this.endPosition = this.points[this.points.length - 1];
		}
		if (this.sliderType == "pass-through") {
			this.passthroughcircle = Math2.getCircumCircle(points[0], points[1], points[2]);
		}
	}
	serialize() {
		var parts = [];
		parts.push(this.position.x);
		parts.push(this.position.y);
		parts.push(this.startTime);
		parts.push(2 | (this.newCombo ? 4 : 0));
		parts.push(HitObject.serializeSoundTypes(this.soundTypes));
		var sliderPoints = [curveTypes[this.curveType]];
		sliderPoints.push(...this.points.slice(1).map(function(item) {
			return item.toString(":");
		}));
		parts.push(sliderPoints.join("|"));
		parts.push(this.repeatCount);
		parts.push(this.pixelLength);
		return parts.join(",");
	}
	render(t, colIndex, comboNumber) {
		if (!t) t = Editor.source.t;
		if (!colIndex || !comboNumber) {
			var i = this.beatmap.HitObjects.indexOf(this);
			if (!colIndex) colIndex = Editor.objc[i][0] % Editor.cols.length;
			if (!comboNumber) comboNumber = Editor.objc[i][1];
		}
		var ar = ars(parseFloat(this.beatmap['ApproachRate']));
		var cs = cspx(parseFloat(this.beatmap['CircleSize']));
		var offset = this.startTime / 1000;
		var x = this.position.x - cs / 2,
			y = this.position.y - cs / 2;
		var td = offset - t;
		if (td > ar) return;
		var color = Editor.cols[colIndex];
		var ctx = document.getElementById('gridcanvas').getContext('2d');
		ctx.save();
		if (td > 0) {
			ctx.globalAlpha = 2 - 2 * td / ar;
			var r_as = cs * (2.5 * td / ar + 1);
			ctx.drawImage(Editor.skin['approachcircle' + colIndex], x + cs / 2 - r_as / 2, y + cs / 2 - r_as / 2, r_as, r_as);
			ctx.drawImage(Editor.skin['hitcircle' + colIndex], x, y, cs, cs);
		} else {
			ctx.globalAlpha = Math.max(1 + td / this.fadetime, 0);
			var r_as = cs * Math.min(-td / ar + 1, 13 / 12);
			ctx.drawImage(Editor.skin['approachcircle' + colIndex], x + cs / 2 - r_as / 2, y + cs / 2 - r_as / 2, r_as, r_as);
			ctx.drawImage(Editor.skin['hitcircle'], x, y, cs, cs);
		}

		var drawOverlay = function() {
			ctx.drawImage(Editor.skin.hitcircleoverlay, x, y, cs, cs);
		};
		var drawNumber = function() {
			var num = Editor.skin['default-' + comboNumber];
			var newh = num.height / Editor.skin['hitcircle'].height * cs * 3 / 4;
			var dh = newh / num.height;
			ctx.drawImage(num, x - num.width * dh / 2 + cs / 2, y - newh / 2 + cs / 2, num.width * dh, newh);
		};
		if (parseInt(Editor.skin._meta.options.HitCircleOverlayAboveNumber || Editor.skin._meta.options.HitCircleOverlayAboveNumer, 10)) {
			drawNumber();
			drawOverlay();
		} else {
			drawOverlay();
			drawNumber();
		}
		ctx.restore();
	}
}

class Spinner extends HitObject {
	constructor(properties) {
		super(properties);
		this.fadetime = .25;
	}
	serialize() {
		var parts = [];
		parts.push(this.position.x);
		parts.push(this.position.y);
		parts.push(this.startTime);
		parts.push(8 | (this.newCombo ? 4 : 0));
		parts.push(HitObject.serializeSoundTypes(this.soundTypes));
		var additions = [];
		additions.push(this.additions.sample ? additionTypes.indexOf(this.additions.sample) : 0);
		additions.push(this.additions.additionalSample ? additionTypes.indexOf(this.additions.additionalSample) : 0);
		additions.push(this.additions.customSampleIndex ? this.additions.customSampleIndex : 0);
		additions.push(this.additions.hitsoundVolume ? this.additions.hitsoundVolume : 0);
		additions.push("");
		parts.push(additions.join(":"));
		return parts.join(",");
	}
	render(t, colIndex, comboNumber) {}
}

if (typeof module !== "undefined") {
	module.exports = HitObject;
	module.exports.HitCircle = HitCircle;
	module.exports.Slider = Slider;
	module.exports.Spinner = Spinner;
} else {
	window.HitObject = Editor.HitObject = HitObject;
	window.HitCircle = Editor.HitCircle = HitCircle;
	window.Slider = Editor.Slider = Slider;
	window.Spinner = Editor.Spinner = Spinner;
}
