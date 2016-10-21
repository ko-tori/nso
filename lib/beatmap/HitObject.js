var Editor = Editor || {};

if (typeof require !== "undefined") {
	Math2 = require("./../Math2");
	Bezier = Math2.Bezier;
	Vector = require("./../Vector");
}

class HitObject {
	static parseAdditions(str) {
		var additions = {};
		if (!str) return additions;
		var parts = str.split(":");

		if (parts[0] && parts[0] !== "0")
			additions.sample = [null, "normal", "soft", "drum"][parseInt(parts[0])];
		if (parts[1] && parts[1] !== "0")
			additions.additionalSample = [null, "normal", "soft", "drum"][parseInt(parts[1])];
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

		properties.startTime = parseInt(parts[2]);
		properties.soundTypes = [];
		properties.newCombo = (properties.objectType & 4) == 4;
		properties.position = new Vector(parseInt(parts[0]), parseInt(parts[1]));

		if ((soundType & 2) == 2) properties.soundTypes.push("whistle");
		if ((soundType & 4) == 4) properties.soundTypes.push("finish");
		if ((soundType & 8) == 8) properties.soundTypes.push("clap");
		if (!properties.soundTypes) properties.soundTypes.push("normal");

		if ((objectType & 1) == 1) {
			properties.additions = HitObject.parseAdditions(parts[5]);
			return new HitCircle(properties);
		} else if ((objectType & 2) == 2) {
			properties.repeatCount = parseInt(parts[6]);
			properties.pixelLength = parseInt(parts[7]);
			properties.additions = HitObject.parseAdditions(parts[10]);
			properties.edges = [];
			properties.points = [properties.position];
			var points = (parts[5] || "").split("|");
			if (points.length) {
				properties.curveType = {
					"C": "catmull",
					"B": "bezier",
					"L": "linear",
					"P": "pass-through"
				}[points[0]] || "unknown";
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
					if (!edge.soundTypes) edge.soundTypes.push("normal");
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
}

class HitCircle extends HitObject {}

class Slider extends HitObject {
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
				if (Math2.isLeft(p1, p2, p3))
					radians *= -1;
				return Math2.rotate(circumCenter, p1, radians);
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
	}
}

class Spinner extends HitObject {}

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