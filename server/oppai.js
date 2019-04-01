var childProcess = require("child_process");

var oppai = function (file, callback, err) {
    var child = childProcess.spawn(/^win/.test(process.platform) ? "./oppai/oppai.exe" : "./oppai/oppai", [file, "-ojson"]);
    child.stdout.on("data", function (data) {
        callback(JSON.parse(data));
    });
    child.stderr.on("data", function (data) {
        if (err) {
            err(data);
        } else {
            console.error("err:", data.toString());
        }
    });
    child.on("error", function (data) {
        if (err) {
            err(data);
        } else {
            console.error("err:", data.toString());
        }
    });
};

module.exports = oppai;