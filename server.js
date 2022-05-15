'use strict';

console.clear();

require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const { ObjectID } = require('mongodb');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');


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
  const usersCollection = await client.db('database').collection('users');

  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }
  }));

  app.use(passport.initialize());
  app.use(passport.session());



  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    usersCollection.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, null);
    });
  });



  app.use('/public', express.static(process.cwd() + '/public'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.route('/').get((req, res) => {
    res.render(__dirname + '/views/pug', {title: 'Connected to Database', message: 'Please login'});
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('Listening on port ' + PORT);
  });

})();
