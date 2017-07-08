var Editor = Editor || {};

class ClipboardManager {

}

if (typeof module !== "undefined") {
    module.exports = ClipboardManager;
} else {
    window.ClipboardManager = Editor.ClipboardManager = ClipboardManager;
}