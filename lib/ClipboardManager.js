var Editor = Editor || {};

class ClipboardManager {
	constructor() {
		this.copyData = [];
	}

	static copyStringFromObjects(objs) {
		var ret = Util.msToTimeString(objs[0].startTime) + " (";
		for (var i = 0; i < objs.length; i++) {
			ret += Editor.objc[Editor.beatmap.HitObjects.indexOf(Editor.selected[i])][1];
			if (i < objs.length - 1) ret += ",";
		}
		return ret + ") - ";
	}

	static copyTextToClipboard() {
		var textArea;
		try {
			textArea = document.createElement("textarea");
			textArea.style.position = 'fixed';
			textArea.style.top = 0;
			textArea.style.left = 0;
			textArea.style.width = '2em';
			textArea.style.height = '2em';
			textArea.style.padding = 0;
			textArea.style.border = 'none';
			textArea.style.outline = 'none';
			textArea.style.boxShadow = 'none';
			textArea.style.background = 'transparent';
			textArea.value = text;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
		} catch (err) {
			console.log('copy failed');
		}
		document.body.removeChild(textArea);
	}

	static createCopyData(objs) {
		return [];
		var ret = [];
		var zero = objs[0].startTime;
		for(var i = 0; i < objs.length; i++) {
			let obj = objs[i];
			ret.push([
				obj.startTime - zero,
				//TODO
			]);
		}
	}

	copySelectedToClipboard() {
		if (Editor.selected.length > 0) {
			var selected = Object.assign([], Editor.selected); // returns a shallow copy so the order in the original Editor.selected is preserved
			selected.sort(function(a, b) {
				return a.startTime - b.startTime;
			});
			var data = ClipboardManager.copyStringFromObjects(selected);
			ClipboardManager.copyTextToClipboard(data);
			this.copyData = ClipboardManager.createCopyData(selected);
			console.log('copied: ' + data);
		} else {
			console.log('nothing copied!');
		}
	}

	cutSelected() {
		copySelectedToClipboard();
		Editor.deleteSelected();
	}

	pasteCopyData(t) {
		if (this.copyData.length != 0) {
			// TODO
		}
	}
}

if (typeof module !== "undefined") {
    module.exports = ClipboardManager;
} else {
    window.ClipboardManager = Editor.ClipboardManager = ClipboardManager;
}