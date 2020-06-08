var mongoose = require('mongoose');
var router = require('express').Router();
var passport = require('passport');
var User = mongoose.model('User');
var auth = require('../auth');

router.get('/user', auth.required, function(req, res, next){
  User.findById(req.payload.id).then(function(user){
    if(!user){ return res.sendStatus(401); }

    return res.json({user: user.toAuthJSON()});
  }).catch(next);
});

router.put('/user', auth.required, function(req, res, next){
  User.findById(req.payload.id).then(function(user){
    if(!user){ return res.sendStatus(401); }

    // only update fields that were actually passed...
    if(typeof req.body.user.username !== 'undefined'){
      user.username = req.body.user.username;
    }
    if(typeof req.body.user.email !== 'undefined'){
      user.email = req.body.user.email;
    }
    if(typeof req.body.user.bio !== 'undefined'){
      user.bio = req.body.user.bio;
    }
    if(typeof req.body.user.image !== 'undefined'){
      user.image = req.body.user.image;
    }
    if(typeof req.body.user.password !== 'undefined'){
      user.setPassword(req.body.user.password);
    }

    return user.save().then(function(){
      return res.json({user: user.toAuthJSON()});
    });
  }).catch(next);
});

router.post('/users/login', function(req, res, next){
  if(!req.body.user.email){
    return res.status(422).json({errors: {email: "can't be blank"}});
  }

  if(!req.body.user.password){
    return res.status(422).json({errors: {password: "can't be blank"}});
  }

  passport.authenticate('local', {session: false}, function(err, user, info){
    if(err){ return next(err); }

    if(user){
      user.token = user.generateJWT();
      return res.json({user: user.toAuthJSON()});
    } else {
      return res.status(422).json(info);
    }
  })(req, res, next);
});

router.post('/users', function(req, res, next){
  var user = new User();

  user.username = req.body.user.username;
  user.email = req.body.user.email;
  user.setPassword(req.body.user.password);

  user.save().then(function(){
    return res.json({user: user.toAuthJSON()});
  }).catch(next);
});

router.post('/forgot-password', function(req, res, next){
  if (!req.body.email){
    res.status(400).send('Provide email');
  }

  User.findOne({email: req.body.email}, (err, user) => {
    if (user === null){
      res.status(200).send("Email is not attached to an account")
    }else { 
      user.token = user.generateJWT();
      user.tokenExpires = Date.now() + 3600000;

      user.save(err => {
        if (err){
          res.status(403).send(err);
          return console.error('Error updating in db');
        }
        return res.status(200).send('sent reset password email');
      })
      console.log(`You are receive this because you (or someone else) requested a password reset on your Conduit user account.
        Please click the following link to complete the process:
        http://localhost:4100/resetpassword?token=${token}`);
    }
  })
});

router.post('/verify-password', function(req, res, next){
  if (req.body.token === '' || req.body.password === ''){
    res.status(400).send('There are parameters missing')
  }
  
  User.findOne({token:req.body.token,
    resetPasswordExpires: {
       $lte: Date.now()
     }
  }, (err, user) =>{
    if (err){
      return res.status(401).send("Error finding user")
    }else {
      if (!user){
        return res.status(401).send("Invalid token")
      }
        user.token = '';
        user.setPassword(req.body.password);

        user.save().then(function(){
          return res.status(200).json({user: user.toAuthJSON()});
        }).catch(next);
    }
  })
});

module.exports = router;
