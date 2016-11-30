var Editor = Editor || {};

var sectionPattern = /^\[([a-zA-Z0-9]+)\]$/,
	keyPairPattern = /^([a-zA-Z0-9]+)[ ]*:[ ]*(.+)$/;
var fs = null;

if (typeof require !== "undefined") {
	var fs = require("fs");
	Color = require("./Color");
	HitObject = require("./beatmap/HitObject");
	Slider = HitObject.Slider;
	TimingPoint = require("./beatmap/TimingPoint");
}

class Beatmap {
	constructor() {}
	static ParseFile(file, callback) {
		fs.exists(file, function(exists) {
			if (!exists) {
				callback(new Error("File doesn't exist."));
			}
			Beatmap.ParseStream(fs.createReadStream(file), function(beatmap) {
				callback(beatmap);
			});
		});
	}
	static ParseStream(stream, callback) {
		var buffer = "";
		stream.on("data", function(chunk) {
			buffer += chunk;
		});
		stream.on("error", function(err) {
			callback(err);
		});
		stream.on("end", function() {
			callback(Beatmap.ParseString(buffer));
		});
	}
	static ParseString(data) {
		var beatmap = new Beatmap();
		var lines = data.split(/\r?\n/);
		var osuSection;
		var sections = {};
		beatmap["ComboColors"] = [];
		for (var i = 0; i < lines.length; i += 1) {
			var line = lines[i].trim();
			if (!line) continue;
			var match = sectionPattern.exec(line);
			if (match) {
				osuSection = match[1].toLowerCase();
				continue;
			}
			switch (osuSection) {
				case "timingpoints":
					if (!("TimingPoints" in sections))
						sections["TimingPoints"] = []
					sections["TimingPoints"].push(line);
					break;
				case "hitobjects":
					if (!("HitObjects" in sections))
						sections["HitObjects"] = []
					sections["HitObjects"].push(line);
					break;
				case "events":
					if (!("Events" in sections))
						sections["Events"] = []
					sections["Events"].push(line);
					break;
				default:
					if (!osuSection) {
						match = /^osu file format (v[0-9]+)$/.exec(line);
						if (match) {
							beatmap.FileFormat = match[1];
							continue;
						}
					} else {
						match = keyPairPattern.exec(line);
						if (match) {
							if (/combo(\d+)/i.exec(match[1])) {
								beatmap["ComboColors"].push(Color.fromArray(match[2].split(",")));
								continue;
							}
							switch (match[1].toLowerCase()) {
								case "tags":
									beatmap[match[1]] = match[2].split(" ");
									break;
								case "bookmarks":
									beatmap[match[1]] = match[2].split(",").map(function(bookmark) {
										return parseInt(bookmark);
									});
									break;
								case "stackleniency":
								case "distancespacing":
								case "beatdivisor":
								case "gridsize":
								case "previewtime":
								case "mode":
								case "hpdrainrate":
								case "circlesize":
								case "approachrate":
								case "overalldifficulty":
								case "slidermultiplier":
								case "slidertickrate":
									beatmap[match[1]] = parseFloat(match[2]);
									break;
								default:
									beatmap[match[1]] = match[2];
									break;
							}
						}
					}
					break;
			}
		}
		beatmap["TimingPoints"] = [];
		beatmap["BpmMin"] = Infinity;
		beatmap["BpmMax"] = 0;
		var prev = null;
		for (var i = 0; i < sections["TimingPoints"].length; i += 1) {
			var timingPoint = new TimingPoint(sections["TimingPoints"][i]);
			if (timingPoint.bpm) {
				beatmap["BpmMin"] = Math.min(beatmap["BpmMin"], timingPoint.bpm);
				beatmap["BpmMax"] = Math.max(beatmap["BpmMax"], timingPoint.bpm);
				timingPoint.baseOffset = timingPoint.offset;
			} else if (prev) {
				timingPoint.beatLength = prev.beatLength;
				timingPoint.bpm = prev.bpm;
				timingPoint.baseOffset = prev.baseOffset;
			}
			prev = timingPoint;
			beatmap["TimingPoints"].push(timingPoint);
		}
		beatmap["TimingPoints"].sort(function(a, b) {
			return a.offset - b.offset;
		});
		beatmap["HitObjects"] = [];
		for (var i = 0; i < sections["HitObjects"].length; i += 1) {
			var hitObject = HitObject.parse(sections["HitObjects"][i]);
			hitObject.beatmap = beatmap;
			if (hitObject instanceof Slider) {
				hitObject.calculate();
			}
			beatmap["HitObjects"].push(hitObject);
		}
		beatmap["HitObjects"].sort(function(a, b) {
			return a.startTime - b.startTime;
		});

		beatmap.breakTimes = [];
		for (var i = 0; i < sections["Events"].length; i += 1) {
			var members = sections["Events"][i].split(',');

			if (members[0] == '0' && members[1] == '0' && members[2]) {
				var bgName = members[2].trim();

				if (bgName.charAt(0) == '"' && bgName.charAt(bgName.length - 1) == '"') {
					beatmap.bgFilename = bgName.substring(1, bgName.length - 1);
				} else {
					beatmap.bgFilename = bgName;
				}
			} else if (members[0] == '2' && /^[0-9]+$/.test(members[1]) && /^[0-9]+$/.test(members[2])) {
				beatmap.breakTimes.push({
					startTime: parseInt(members[1]),
					endTime: parseInt(members[2])
				});
			}
		}

		// console.log(sections);
		return beatmap;
	}
	getTimingPoint(offset) {
		var left = 0,
			right = this.TimingPoints.length - 1;
		var result = 0;
		while (left <= right) {
			var midpoint = ~~((left + right) / 2);
			if (this.TimingPoints[midpoint].offset > offset) {
				right = midpoint - 1;
			} else {
				result = midpoint;
				left = midpoint + 1;
			}
		}
		return this.TimingPoints[result];
		// for (var i = this.TimingPoints.length - 1; i >= 0; i -= 1) {
		// 	if (this.TimingPoints[i].offset <= offset)
		// 		return this.TimingPoints[i];
		// }
		// return this.TimingPoints[0];
	}

	getIndexAt(offset) {
		for (var i = 0; i < this.HitObjects.length; i++) {
			var obj = this.HitObjects[i];
			if (obj instanceof Slider || obj instanceof Spinner) {
				if (offset < obj.endTime) {
					return i;
				}
			} else {
				if (offset <= obj.startTime) {
					return i;
				}
			}
		}
		return i - 1;
	}
}


if (typeof module !== "undefined") {
	module.exports = Beatmap;
} else {
	window.Beatmap = Editor.Beatmap = Beatmap;
}
