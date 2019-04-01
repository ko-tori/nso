const config = require('./config');

var bcrypt = require('bcrypt-nodejs');
const mongo = require('mongodb').MongoClient;
var users;

mongo.connect(config.url, { useNewUrlParser: true }, function(err, client) {
    if (err) {
    	console.error(err);
    	return;
    }

    users = client.db('nso').collection('users');
});

class Users {
	static all(callback) {
		users.find().toArray(callback);
	}

	static createUser(username, password, callback) {
		users.find({ username: username }).toArray((err, items) => {
			if (err) {
	        	console.error('error retrieving users...');
	        	callback(err, null);
	    	}
	        
	        if (items.length < 1) {
            	users.insertOne({
			        username: username.trim(),
			        password: bcrypt.hashSync(password),
			    }, callback);
            } else {
            	callback({ message: "User already exists!" }, null);
            }
	    });
	}

	static verifyUser(username, password, done) {
        Users.getUser(username, (err, user) => {
            if (err) { return done(err); }
            if (!user) { return done(null, false); }

            if (!bcrypt.compareSync(password, user.password)) {
            	console.log(`failed to verify ${username} with password ${password}`);
            	return done(null, false);
            }

            console.log(`verified ${username} with password ${password}`);
            return done(null, user);
        });
    }

    static getUser(username, callback) {
    	users.findOne({ username: username }, callback);
    }

    static deserializeUser(id, done) {
	    users.findOne({ '_id': id }, (err, user) => {
	        done(err, user);
	    });
	}

	static clear() {
		users.drop();
	}
}

module.exports = Users;