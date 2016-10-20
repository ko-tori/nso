var Editor = Editor || {};
var Beatmap = function() {};

var sectionPattern = /^\[([a-zA-Z0-9]+)\]$/,
	keyPairPattern = /^([a-zA-Z0-9]+)[ ]*:[ ]*(.+)$/;

if (typeof require !== "undefined") {
	// server-side only functions
	var fs = require("fs");
	var Color = require("./Color");
	var TimingPoint = require("./beatmap/TimingPoint");

	Beatmap.ParseFile = function(file, callback) {
		fs.exists(file, function(exists) {
			if (!exists) {
				callback(new Error("File doesn't exist."));
			}
			Beatmap.ParseStream(fs.createReadStream(file), function(beatmap) {
				callback(beatmap);
			});
		});
	};

	Beatmap.ParseStream = function(stream, callback) {
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
	};
}

Beatmap.ParseString = function(data) {
	var beatmap = new Beatmap();
	var lines = data.split(/\r?\n/);
	var osuSection;
	var sections = {};
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
							if (!("ComboColors" in beatmap))
								beatmap["ComboColors"] = [];
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
	for (var i = 0; i < sections["TimingPoints"].length; i += 1) {
		var timingPoint = new TimingPoint(sections["TimingPoints"][i]);
		if (timingPoint.bpm) {
			beatmap["BpmMin"] = Math.min(beatmap["BpmMin"], timingPoint.bpm);
			beatmap["BpmMax"] = Math.max(beatmap["BpmMax"], timingPoint.bpm);
		}
		beatmap["TimingPoints"].push(timingPoint);
	}
	beatmap["TimingPoints"].sort(function(a, b) { return a.offset - b.offset; });
	// console.log(sections);
	return beatmap;
};

if (typeof module !== "undefined") {
	module.exports = Beatmap;
} else {
	window.Beatmap = Editor.Beatmap = Beatmap;
}