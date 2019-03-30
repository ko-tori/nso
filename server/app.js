var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require("socket.io")(server);
var cookieParser = require('cookie-parser');
var path = require('path');
var bodyParser = require('body-parser');
var userAuth = require('./db/auth');

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

app.use(userAuth.initialize());
app.use(userAuth.session());

app.use(express.static("ext"));
app.use(express.static("static"));

app.use('/', require('./routes/index')(app, io));
app.use('/d', require('./routes/editor')(app, io));
app.use('/f', require('./routes/file'));

server.listen(3000, function() {
    console.log(`Running on port 3000...`);
});