const express = require('express');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
var app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');
const {ensureAuthenticated} = require('./helpers/auth');
const {isAlphaNum} = require('./helpers/string');

const port = 5000;

// Starting Server
app.listen(port, () => {
  console.log(`Server started on ${port}`);
});

// Express Middleware for Static Files
app.use('/public', express.static('./public'));

// Connect to mongoose
mongoose.connect('YourMongoDatabaseURL')
  .then(() => console.log(`MongoDB Connected`))
  .catch(err => console.log(err));

// Load User Model
require('./models/User');
const User = mongoose.model('users');

// Load Key Model
require('./models/Key');
const Key = mongoose.model('keys');

// Load Follow Model
require('./models/Follow');
const Following = mongoose.model('following');

// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Handlebars Middleware
app.engine('handlebars', exphbs({
  defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

// Sessions Middleware
app.use(session({
  secret: 'Yoursecret',
  resave: true,
  saveUninitialized: true
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport.js')(passport);

// Flash Middleware
app.use(flash());

// Global Variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  res.locals.serverIP = 'NginxServerIP';
  next();
});

// Index Route
app.get('/', (req, res) => {
  if(!req.isAuthenticated())
    res.render('index');
  else {
    res.redirect('/dashboard')
  }
});

// Register Route
app.get('/users/register', (req, res) => {
  res.render('users/register');
});

// Login Route
app.get('/users/login', (req, res) => {
  res.render('users/login');
});

// Register Post Route
app.post('/users/register', (req, res) => {
  let errors = [];
  if(req.body.password != req.body.confirmPassword){
    errors.push({text: 'Passwords do not match'});
  }
  if(req.body.password.length < 6){
    errors.push({text: 'Passwords must be atleast 6 characters'});
  }
  if(errors.length > 0){
    res.render('users/register', {
      errors: errors,
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
    });
  }
  else{
    User.findOne({email: req.body.email})
    .then(user => {
      if(user) {
        req.flash('error_msg', 'Email already registered');
        res.redirect('/users/register');
      } else {
          const newUser = new User({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password
          });

          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
              if(err) throw err;
              newUser.password = hash;
              newUser.save().
              then(user => {
                req.flash('success_msg', 'You are now registered and can login');
                res.redirect('/users/login');
              })
              .catch(err => {
                console.log(err);
                return;
              });
            });
          });
        }
    });
  }
});

//Login Form POST
app.post('/users/login', (req, res, next) => {
  //passport.initialize();
  passport.authenticate('local', {
    failureRedirect: '/users/login',
    successRedirect: '/dashboard',
    failureFlash: true
  })(req, res, next);
});

// Logout User
app.get('/users/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/users/login');
});

// Dashboard Route
app.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('./dashboard', {
    layout: 'dashboard',
    username: req.user.username
  });
});

// Search Users
app.get('/dashboard/search', ensureAuthenticated, (req, res) => {
  var q = req.query.q;

  var query = "";
  for (i = 0; i < q.length; i++){
    if (!isAlphaNum(q.charAt(i))) {
      query = query + "\\" + q.charAt(i);
    } else{
      query += q.charAt(i);
    }
  }

  User.find({'username' : new RegExp(query, 'i')})
    .then(users => {
      if(users.length > 0){
        //console.log(users[0].username);
        res.render('./dashboard/search', {
          layout: 'dashboard',
          users: users
        });
      } else{
        res.render('./dashboard/search', {
          layout: 'dashboard',
          errors: [{text: 'No search results found'}],
          users: []
        });
      }
  })
    .catch(err => console.log(err));
});

app.get('/users/following/:id', ensureAuthenticated, (req, res) => {
  const newFollowing = new Following({
    username: req.user.username,
    following: [req.params.id]
  });
  Following.findOne({username: req.user.username})
    .then(follow => {
      if(follow){
        Following.update({ username: req.user.username }, {$push: {following: req.params.id}})
          .then(success => {
            req.flash('success_msg', `You are now following ${req.params.id}`);
            res.redirect('/users/watch/' + req.params.id);
          })
          .catch(err => console.log(err));
      } else{
        newFollowing.save()
          .then(following => {
            req.flash('success_msg', `You are now following ${req.params.id}`);
            res.redirect('/users/watch/' + req.params.id);
          });
      }
    })
    .catch(err => console.log(err));
});

app.get('/users/watch/:id', ensureAuthenticated, (req, res) => {
  Key.findOne({username: req.params.id})
    .then(key => {
      if(key){
        res.render('./users/watch/user', {
          layout: 'user',
          username: req.params.id,
          streamKey: key.key
        });
      } else{
        req.flash('error_msg', `User is currently offline`);
        res.redirect('/dashboard');
      }
    })
    .catch(err => console.log(err));
});

app.get('/dashboard/streaming', ensureAuthenticated, (req, res) => {
  res.render('./dashboard/streaming');
});

app.get('/dashboard/streamKey', ensureAuthenticated, (req, res) => {
  res.render('./dashboard/stream_key');
});

app.post('/dashboard/key', ensureAuthenticated, (req, res) => {
  const streamKey = req.body.streamKey;
  const newKey = new Key({
    username: req.user.username,
    key: req.body.streamKey
  });
  Key.findOneAndUpdate({username: req.user.username}, {$set: {key:streamKey}}, {upsert: true, new: true})
    .then(key => {
      //console.log(key.key);
    })
    .catch(err=>console.log(err));
  res.redirect('/users/' + req.user.username);
});

app.get('/users/:id', ensureAuthenticated, (req, res) => {
  Key.findOne({username: req.user.username})
    .then(key => {
      res.render('./users/user', {
          layout: 'user',
          streamKey: key.key
      });
    })
    .catch(err => console.log(err));
});
