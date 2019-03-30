var r = require('rethinkdb');
var connection;

r.connect({ host: 'localhost', port: 28015 }, function(err, conn) {
    if (err) throw err;
    connection = conn;
    r.dbCreate('nso').run(connection, function(err, res) {
        if (!err) {
            console.log('Created nso database!');
        }
    });
    r.db('nso').tableCreate('maps').run(connection, function(err, res) {
        if (!err) {
            console.log('Created table "maps"!');
        }
    });
});

class Maps {
	static get(id, callback) {
		r.db('nso').table('maps').get(id).run(connection, callback);
	}
}

module.exports = Maps;