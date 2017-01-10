var Editor = Editor || {};

if (typeof require !== "undefined") {
    var fs = require("fs");
    var path = require("path");
    var common = require("../common");
    var Beatmap = require("./Beatmap");
    var Util = require("./Util");
}

class Room {
    static all() {
        return common.db.get("rooms").__wrapped__.rooms;
    }
    static deserialize(object) {
        var beatmap = Beatmap.unjson(object.beatmap);
        var room = new Room(beatmap);
        room.id = object.id;
        room.mapId = object.mapId;
        return room;
    }
    static newRoom(map, difficulty) {
        var osuFile = path.join(path.dirname(__dirname), "uploads", map, difficulty);
        if (!fs.existsSync(osuFile)) {
            throw "doesn't exist lol";
        }
        var beatmap = Beatmap.ParseFileSync(osuFile);
        var room = new Room(beatmap);
        room.mapId = map;
        return room;
    }
    static newID() {
        var rooms = Room.all();
        var id;
        while (true) {
            id = Util.randomString();
            if (id in rooms) continue;
            break;
        }
        return id;
    }
    static get(id) {
        var rooms = Room.all();
        if (id in rooms) {
            var room = rooms[id];
            return Room.deserialize(room);
        }
        return null;
    }
    constructor(beatmap) {
        this.id = Room.newID();
        this.beatmap = beatmap;
        this.initialized = false;
    }
    publicData() {
        return {
            url: `/d/${this.id}`,
            difficulty: `${this.beatmap.ArtistUnicode} - ${this.beatmap.TitleUnicode} [${this.beatmap.Version}]`
        };
    }
    serialize() {
        return {
            "id": this.id,
            "mapId": this.mapId,
            "beatmap": this.beatmap.json()
        };
    }
    save() {
        var rooms = common.db.get("rooms");
        rooms.__wrapped__.rooms[this.id] = this.serialize();
        rooms.value();
    }
}

if (typeof module !== "undefined") {
    module.exports = Room;
} else {
    window.Room = Editor.Room = Room;
}