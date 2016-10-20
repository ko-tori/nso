var Editor = Editor || {};

if (typeof require !== "undefined") {
	Vector = require("./../Vector");
	HitCircle = require("./HitCircle");
}

class HitObject {
	parse(line) {
		var parts = line.split(",");
		var soundType = parseInt(parts[4]);
		var objectType = parseInt(parts[3]);
		var properties = {}

		properties.startTime = parseInt(parts[2]);
		properties.soundTypes = [];
		properties.newCombo = (properties.objectType & 4) == 4;
		properties.position = new Vector(parseInt(parts[0]), parseInt(parts[1]));

		if ((soundType & 2) == 2) properties.soundTypes.push("whistle");
		if ((soundType & 4) == 4) properties.soundTypes.push("finish");
		if ((soundType & 8) == 8) properties.soundTypes.push("clap");
		if (!properties.soundTypes) properties.soundTypes.push("normal");

		if ((objectType & 1) == 1) {
			return new HitCircle(properties);
		}
	}
}

if (typeof module !== "undefined") {
	module.exports = HitObject;
} else {
	window.HitObject = Editor.HitObject = HitObject;
}