var Editor = Editor || {};

class Vector {
	constructor(_x, _y) {
		this.x = _x;
		this.y = _y;
	}
}

if (typeof module !== "undefined") {
	module.exports = Vector;
} else {
	window.Vector = Editor.Vector = Vector;
}