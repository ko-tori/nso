var bcrypt = require('bcrypt-nodejs');

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
    r.db('nso').tableCreate('users').run(connection, function(err, res) {
        if (!err) {
            console.log('Created table "users"!');
        }
    });
});

class Users {
	static all(callback) {
		r.db('nso').table('users').run(connection, function(err, u) {
        	u.toArray(callback);
    	});
	}

	static createUser(username, password, callback) {
		r.db('nso').table('users').filter(r.row('username').eq(username)).run(connection, function(err, u) {
			if (err) {
	        	console.log('error retrieving users...');
	        	callback(err, null);
	    	}
	        u.toArray((err, users) => {
	            if (err || users.length < 1) {
	            	r.db('nso').table('users').insert({
				        username: username,
				        password: password,
				    }).run(connection, callback);
	            } else {
	            	callback({ message: "User already exists!" }, null);
	            }
	        });
	    });
	}

	static verifyUser(username, password, done) {
        r.db('nso').table('users').filter(r.row('username').eq(username)).run(connection, function(err, user) {
            if (err) { return done(err); }
            if (!user) { return done(null, false); }

            user.toArray(function(err, result) {
                if (err) throw err;
                if (result.length == 0) { return done(null, false); }
                if (!bcrypt.compareSync(password, result[0].password)) { return done(null, false); }
                return done(null, result[0]);
            });
        });
    }

    static getUser(username, callback) {
    	r.db('nso').table('users').filter(r.row('username').eq(username)).run(connection, callback);
    }

    static deserializeUser(id, done) {
	    r.db('nso').table('users').filter(r.row('id').eq(id)).run(connection, function(err, user) {
	        if (err) { return done(err); }
	        if (!user) { return done(null, false); }
	        user.toArray(function(err, result) {
	            if (err) throw err;
	            return done(null, result[0]);
	        });
	    });
	}

	static clear() {
		r.db('nso').table('users').delete().run(connection);
	}
}

module.exports = Users;