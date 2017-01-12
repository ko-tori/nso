var Editor = Editor || {};

if (typeof require !== "undefined") {
    var common = require("../common");
    var Util = require("./Util");
    var bcrypt = require("bcrypt");
}

class User {
    static deserialize(object) {
        var user = new User(object.username);
        user.password = object.password;
        return user;
    }
    static getByUsername(username) {
        var userData = common.db.get("users").find({ usernameLower: username.toLowerCase() }).value();
        if (userData) {
            var user = User.deserialize(userData);
            return user;
        }
        return null;
    }
    static getByToken(token) {
        var tokenData = common.db.get("loginTokens").find({ token: token }).value();
        if (tokenData) {
            var user = User.getByUsername(tokenData.usernameLower);
            return user;
        }
        return null;
    }
    static loginStatus(req, res, next) {
        res.locals.currentUser = {};
        if (req.signedCookies.token) {
            var token = common.db.get("loginTokens").find({ token: req.signedCookies.token }).value();
            if (token) {
                var user = User.getByUsername(token.usernameLower);
                res.locals.currentUser = user;
                res.locals.currentUser.isAuthenticated = true;
            }
        } else {
            res.locals.currentUser.isAuthenticated = false;
        }
        next();
    }
    constructor(username) {
        this.username = username;
    }
    getLoginToken() {
        common.db.get("loginTokens").remove({ usernameLower: this.username.toLowerCase() }).value();
        var token = Util.randomString(40, "0123456789abcdef");
        common.db.get("loginTokens").push({
            usernameLower: this.username.toLowerCase(),
            token: token
        }).value();
        return token;
    }
    setPassword(password) {
        this.password = bcrypt.hashSync(password, 10);
    }
    checkPassword(password) {
        return bcrypt.compareSync(password, this.password);
    }
    save() {
        common.db.get("users").remove({ usernameLower: this.username.toLowerCase() }).value();
        common.db.get("users").push({
            username: this.username,
            usernameLower: this.username.toLowerCase(),
            password: this.password,
        }).value();
    }
}

if (typeof module !== "undefined") {
    module.exports = User;
} else {
    window.User = Editor.User = User;
}