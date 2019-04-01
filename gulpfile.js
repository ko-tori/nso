var gulp = require("gulp");
// var cssmin = require("gulp-cssmin");
// var concatcss = require("gulp-concat-css");
var concatjs = require("gulp-concat");
var rename = require("gulp-rename");
var runsequence = require("run-sequence");
var watch = require("gulp-watch");
var uglify = require("gulp-uglifyjs");
var sourcemaps = require("gulp-sourcemaps");

gulp.task("concat-js", function() {
	gulp.src([
			// external libraries
			"ext/jquery.min.js",
			"ext/jszip.min.js",
			"ext/delivery.js",
			"ext/socket.io.min.js",
			"static/nsoutils2.js",

			// other libs
			"lib/Polyfill.js",
			"lib/Color.js",
			"lib/Math2.js",
			"lib/Vector.js",
			"lib/beatmap/HitObject.js",
			"lib/beatmap/TimingPoint.js",
			"lib/Beatmap.js",
			"lib/Player.js",
			"lib/Skin.js",
			"lib/MapUtils.js",

			// main stuff
			"lib/Socket.js",
			"lib/Main.js"
		])
		.pipe(sourcemaps.init())
		.pipe(sourcemaps.write())
		.pipe(concatjs("nso.js"))
		.pipe(gulp.dest("static"));
});

gulp.task("uglify-js", function() {
	gulp.src("static/nso.js")
		.pipe(uglify("nso.min.js", {
			"mangle": false
		}))
		.pipe(gulp.dest("static"));
});

// gulp.task("concat-css", function() {
// 	gulp.src("css/src/*.css")
// 		.pipe(concatcss("trucksu.css"))
// 		.pipe(gulp.dest("css"));
// });

// gulp.task("minify-css", function() {
// 	gulp.src("css/trucksu.css")
// 		.pipe(cssmin())
// 		.pipe(rename({
// 			suffix: ".min"
// 		}))
// 		.pipe(gulp.dest("css"));
// });

gulp.task("watch", function() {
	watch(["ext/*.js", "lib/**/*.js"], function() {
		runsequence("concat-js" /* , "uglify-js"*/ );
	});
	// watch("css/src/*.css", function() {
	// 	runsequence("concat-css", "minify-css");
	// });
});

gulp.task("default", function() {
	gulp.start("concat-js");//, "uglify-js" /*, "concat-css", "minify-css"*/ );
});