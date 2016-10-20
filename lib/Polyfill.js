(function() {
	var lastTime = 0;
	var vendors = ["ms", "moz", "webkit", "o"];
	for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
		window.requestAnimationFrame = window[vendors[x] + "RequestAnimationFrame"];
		window.cancelAnimationFrame = window[vendors[x] + "CancelAnimationFrame"] ||
			window[vendors[x] + "CancelRequestAnimationFrame"];
	}

	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = function(callback, element) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var id = window.setTimeout(function() {
					callback(currTime + timeToCall);
				},
				timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};

	if (!window.cancelAnimationFrame)
		window.cancelAnimationFrame = function(id) {
			clearTimeout(id);
		};
}());

String.prototype.pad = function(length, fill) {
	fill = fill || "0";
	var padded = Array(length + 1).join("0") + this;
	return padded.substring(padded.length - length);
};

Array.prototype.equals = function(other) {
	if (this.length !== other.length) return false;
	for (var i = 0; i < this.length; i++) {
		if (this[i] != other[i]) return false;
	}
	return true;
};