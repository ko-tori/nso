var bcrypt = require('bcrypt-nodejs');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var users = require('./users')

passport.use(new LocalStrategy(users.verifyUser));

// Provide a user serialization method
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

// Deserialize the user: Get the record from the db and return it
passport.deserializeUser(users.deserializeUser);

module.exports = passport;