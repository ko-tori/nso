var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require("socket.io")(server);
var cookieParser = require('cookie-parser');
var path = require('path');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var r = require('rethinkdb');
var connection;
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: false
}));

app.use(require('express-session')({
    secret: '0su ns0',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static("ext"));
app.use(express.static("static"));

app.use('/', require('./routes/index')(app, io));
app.use('/d', require('./routes/editor')(app, io));
app.use('/f', require('./routes/file'));

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

passport.use(new LocalStrategy(
    function(username, password, done) {
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
));

// Provide a user serialization method
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

// Deserialize the user: Get the record from the db and return it
passport.deserializeUser(function(id, done) {
    r.db('nso').table('users').filter(r.row('id').eq(id)).run(connection, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        user.toArray(function(err, result) {
            if (err) throw err;
            return done(null, result[0]);
        });
    });
});

server.listen(3000, function() {
    console.log(`Running on port 3000...`);
});