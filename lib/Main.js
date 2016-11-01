// Global Variables
var mouseX = 0,
	mouseY = 0;
var keyMap = Array(256);
var width, height;

var room = location.pathname.substring(0, 2);

function dataURItoBlob(dataURI) {
	// convert base64/URLEncoded data component to raw binary data held in a string
	var byteString;
	if (dataURI.split(',')[0].indexOf('base64') >= 0)
		byteString = atob(dataURI.split(',')[1]);
	else
		byteString = unescape(dataURI.split(',')[1]);

	// separate out the mime component
	var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

	// write the bytes of the string to a typed array
	var ia = new Uint8Array(byteString.length);
	for (var i = 0; i < byteString.length; i++) {
		ia[i] = byteString.charCodeAt(i);
	}

	return new Blob([ia], { type: mimeString });
}

if (location.search) {
	// new upload initialization stuff
} else {

}

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
	Editor.audioCtx = new AudioContext();
	Editor.socket = new Socket();
	frame();
});
