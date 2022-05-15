'use strict';

console.clear();

require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const { ObjectID } = require('mongodb');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');


const app = express();

fccTesting(app); //For FCC testing purposes

app.set('view engine', 'pug');



function getDbClient() {
  return new Promise(async (resolve, reject) => {

    try {
      await myDB(resolve);
    } catch (err) {
      reject(err);
    }
  });
}

(async () => {


  const client = await getDbClient();
  const userCollection = await client.db('database').collection('users');

  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }
  }));

  app.use(passport.initialize());
  app.use(passport.session());


  passport.use(new LocalStrategy(
    function(username, password, done) {
      userCollection.findOne({ username: username }, function (err, user) {
        console.log('User '+ username +' attempted to log in.');
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        if (password !== user.password) { return done(null, false); }
        return done(null, user);
      });
    }
  ));



  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    userCollection.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    });
  });



  app.use('/public', express.static(process.cwd() + '/public'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.route('/').get((req, res) => {
    res.render(__dirname + '/views/pug', {
      title: 'Connected to Database', 
      message: 'Please login',
      showLogin: true,
    });
  });


  app.post('/login', passport.authenticate('local', { failureRedirect: '/' }), function(req, res) {
    res.send();
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('Listening on port ' + PORT);
  });

})();
