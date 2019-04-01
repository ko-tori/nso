var fs = require("fs");
var path = require("path");

var Beatmap = require("../../lib/Beatmap");
var MapUtils = require("../../lib/MapUtils");
var Util = require("../../lib/Util");
const config = require('./config');

const mongo = require('mongodb').MongoClient;
var rooms;
var roomObjs = {};
var io;

const saveTimeout = 5000;

mongo.connect(config.url, { useNewUrlParser: true }, function(err, client) {
    if (err) {
    	callback(err);
    }

    rooms = client.db('nso').collection('rooms');

    rooms.find().toArray((err, roomsArray) => {
    	roomsArray.forEach(room => {
            roomObjs[room.id] = Room.deserialize(room);
            roomObjs[room.id].start();
        });
    });
});

class Room {
    static init(_io) {
        io = _io;
    }

	static all() {
        return roomObjs;
    }

    static clear() {
        rooms.drop();
        roomObjs = {};
    }

    static getPublicList() {
        return Object.values(Room.all()).map(r => r.publicData());
    }

    static deserialize(object) {
        var beatmap = Beatmap.unjson(object.beatmap);
        var room = new Room(beatmap);
        room.id = object.id;
        room.mapId = object.mapId;
        return room;
    }

    static newRoom(map, difficulty) {
        var osuFile = path.join(__dirname, "../../uploads", map, difficulty);
        if (!fs.existsSync(osuFile)) {
            throw "doesn't exist lol";
        }
        var beatmap = Beatmap.ParseFileSync(osuFile);
        var room = new Room(beatmap);
        room.mapId = map;
        roomObjs[room.id] = room;
        room.save();
        return room;
    }

    static newID() {
        var r = roomObjs;
        var id;
        while (true) {
            id = Util.randomString();
            if (id in r) continue;
            break;
        }
        return id;
    }

    static get(id) {
        return roomObjs[id];
    }

    constructor(beatmap) {
        this.id = Room.newID();
        this.beatmap = beatmap;
        this.initialized = false;
        this.previousSaveTime = 0;
    }

    start() {
        if (this.initialized) return;
        var url = "/d/" + this.id;
        var beatmap = this.beatmap;
        //console.log("creating " + this.id, "mapID: " + this.mapId);
        if (!(url in io.nsps)) {
            var nsp = io.of(url);
            //console.log("created room: " + url);
            var clients = {};
            nsp.on('connection', socket => {
                console.log(socket.client.id + ' joined ' + url);

                socket.emit('hi', beatmap.json());

                socket.on('join', data => {
                    for (var i in clients) {
                        if (clients.hasOwnProperty(i)) {
                            socket.emit('join', [i, clients[i]]);
                        }
                    }
                    socket.broadcast.emit('join', [socket.client.id, data]);
                    clients[socket.client.id] = data;
                });

                socket.on('msg', data => {
                    socket.broadcast.emit('msg', data);
                });

                socket.on('disconnect', data => {
                    delete clients[socket.client.id];
                    socket.broadcast.emit('leave', socket.client.id);
                });

                socket.on('edit move', data => {
                    var obj = beatmap.matchObj(data[0]);
                    if (obj) {
                        var dx = data[1] - obj.position.x,
                            dy = data[2] - obj.position.y;

                        MapUtils.moveObject(obj, dx, dy);
                    } else {
                        //console.log('object not found!');
                    }
                    socket.broadcast.emit('edit move', data);
                    this.save();
                });
            });
        }
        this.initialized = true;
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
        let time = new Date().getTime();
        if (time - this.previousSaveTime > saveTimeout) {
            //console.log('saving room ' + this.id);
            rooms.updateOne({ id: this.id }, { $set: this.serialize() }, { upsert: true }, (err, result) => {
                if (err)
                    console.error(err);
                else {
                    //console.log('saved room ' + this.id);
                    this.previousSaveTime = time;
                }
            });
        }
    }
}

module.exports = Room;