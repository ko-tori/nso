const config = require('./config');

const mongo = require('mongodb').MongoClient;
var maps;

mongo.connect(config.url, { useNewUrlParser: true }, function(err, client) {
	if (err) {
		console.error(err);
		return;
	}

	maps = client.db('nso').collection('maps');
});


class Maps {
	static get(id, callback) {
		maps.findOne({ '_id': id }, callback);
	}
}

module.exports = Maps;