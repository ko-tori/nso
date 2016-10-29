// Global Variables
var mouseX = 0,
	mouseY = 0;
var keyMap = Array(256);
var width, height;

var room = location.pathname.substring(0,2);

var retrieveMap = functon(){
	if(location.search){
		Editor.osz = localStorage.getItem("upload");
	}
	else{
		//do a delivery thing
	}
};

Editor.align = function() {
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
};

Editor.render = function(ctx) {

};

var frame = function() {
	if (Editor.playing) {
		window.requestAnimationFrame(frame);
	}
};

$(window).on("resize", function() {
	Editor.align();
});

$(document).ready(function main() {
	Editor.align();
	Editor.socket = new Socket();
	frame();
});