var Editor = Editor || {};

class Util {
    static randomString(length, chars) {
        length = length || 32;
        chars = chars || "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var result = "";
        for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
        return result;
    }
}

if (typeof module !== "undefined") {
    module.exports = Util;
} else {
    window.Util = Editor.Util = Util;
}