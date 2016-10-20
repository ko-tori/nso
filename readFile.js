var Beatmap = require("./lib/Beatmap");

console.log("Reading", process.argv[2]);
Beatmap.ParseFile(process.argv[2], function(beatmap) {
	console.log(beatmap);
});