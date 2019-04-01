var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');

var users = require('../db/users');

router.get('/', function(req, res) {
    if (!req.user)
        res.render('profilesearch', { user: req.user });
    else 
        res.redirect(`/u/${req.user.username}`);
});

router.get('/:username', function(req, res) {
    users.getUser(req.params.username, function(err, u) {
        if (!u) res.render('profile', { user: req.user, u: undefined });
        else {
            res.render('profile', { user: req.user, u: u });
        }
    });
});

module.exports = router;