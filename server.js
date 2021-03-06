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
const bcrypt = require('bcrypt');


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

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
};

(async () => {

  // setup database
  const client = await getDbClient();
  const userCollection = await client.db('database').collection('users');

  // middlewares
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


        const credentialsAreValid = bcrypt.compareSync(password, user.password);
        if (!credentialsAreValid) {
          return done(null, false); 
        }

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


  // routes
  app.route('/').get((req, res) => {
    res.render(__dirname + '/views/pug', {
      title: 'Connected to Database', 
      message: 'Please login',
      showLogin: true,
      showRegistration: true,
    });
  });


  app.route('/register')
    .post((req, res, next) => {
      userCollection.findOne({ username: req.body.username }, function(err, user) {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect('/');
        } else {

          const hash = bcrypt.hashSync(req.body.password, 12);
          
          userCollection.insertOne({
            username: req.body.username,
            password: hash
          },
            (err, doc) => {
              if (err) {
                res.redirect('/');
              } else {
                // The inserted document is held within
                // the ops property of the doc
                next(null, doc.ops[0]);
              }
            }
          )
        }
      })
    },
      passport.authenticate('local', { failureRedirect: '/' }),
      (req, res, next) => {
        res.redirect('/profile');
      }
    );


  app.post('/login', passport.authenticate('local', { failureRedirect: '/' }), function(req, res) {
    res.redirect('/profile');
  });

  app.route('/profile')
    .get(ensureAuthenticated, (req,res) => {
      res.render(__dirname + '/views/pug/profile', {
        username: req.user.username
      });
    });


  app.route('/logout')
    .get((req, res) => {
      req.logout();
      res.redirect('/');
    });


  /// not found route
  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not Found');
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('Listening on port ' + PORT);
  });

})();
