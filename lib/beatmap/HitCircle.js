var Editor = Editor || {};

if (typeof require !== "undefined") {
	HitObject = require("./HitObject");
}

class HitCircle {

}

if (typeof module !== "undefined") {
	module.exports = HitCircle;
} else {
	window.HitCircle = Editor.HitCircle = HitCircle;
}