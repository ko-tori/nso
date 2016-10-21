// Global Variables
var mouseX = 0,
	mouseY = 0;
var keyMap = Array(256);
var width, height, screen;

class Screen {
	constructor() {
		self.socket = new Socket();
	}
	align() {
		height = $(window).height() * 0.75;
		width = height * 4 / 3;

		$("#centersection > canvas").attr("width", $(document).width());
		$("#centersection > canvas").attr("height", $(document).height());

		var grid = document.getElementById("grid");
		grid.style.left = ($(window).width() - width) / 2;
		grid.style.top = $(window).height() * 0.16;
		grid.style.width = width;
		grid.style.height = height;

		$("#righttoolbar > img").width($("#lefttoolbar > img")[0].width);
		$("#righttoolbar").css("top", 14 + (1 - $("#righttoolbar").height() / ($("#container").height() - $("#topsection").height() - $("#bottomsection").height())) * 50 + "%");
	}
	render(ctx) {

	}
}

var frame = function() {
	window.requestAnimationFrame(frame);
};

$(window).on("resize", function() {
	screen.align();
});

$(document).ready(function main() {
	screen = new Screen();
	screen.align();
	frame();
});