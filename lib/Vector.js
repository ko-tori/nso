var Editor = Editor || {};

class Vector {
	constructor(_x, _y) {
		this.x = _x;
		this.y = _y;
	}
	angleTo(other) {
		var dx = other.x - this.x;
		var dy = other.y - this.y;
		return Math.atan(dy / dx);
	}
	distanceTo(other) {
		var dx = other.x - this.x;
		var dy = other.y - this.y;
		return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
	}
	equals(other) {
		return this.x == other.x && this.y == other.y;
	}
	toPol() {
		// treating x, y as r, theta
		var x = this.x * Math.cos(this.y);
		var y = this.x * Math.sin(this.y);
		return new Vector(x, y);
	}
}

if (typeof module !== "undefined") {
	module.exports = Vector;
} else {
	window.Vector = Editor.Vector = Vector;
}