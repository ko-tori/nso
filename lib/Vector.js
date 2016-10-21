var Editor = Editor || {};

class Vector {
	constructor(_x, _y) {
		this.x = _x;
		this.y = _y;
	}

	get m() {
		return Math.pow(this.x * this.x + this.y * this.y, .5);
	}

	add(v) {
		return new Vector(this.x + v.x, this.y + v.y);
	}
	
	sub(v) {
		return new Vector(this.x - v.x, this.y - v.y);
	}

	norm() {
		return Vector(this.x / this.m, this.y / this.m);
	}
}

if (typeof module !== "undefined") {
	module.exports = Vector;
}
else {
	window.Vector = Editor.Vector = Vector;
}