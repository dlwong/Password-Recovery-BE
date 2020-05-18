var mongoose = require('mongoose');
var router = require('express').Router();
var passport = require('passport');
var User = mongoose.model('User');
var auth = require('../auth');
const nodemailer = require('nodemailer');

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

router.post('/users/forgot-password', function(req, res, next){
  if (req.body.email === ''){
    res.status(400).send('Provide email');
  }

  User.findOne({email: req.body.email}, (err, user) => {
    if (user === null){
      res.status(200).send("Email is not attached to an account")
    }else {
      
      const token = user.generateJWT();
      user.token = token;
      
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: `EMAIL_ADDRESS`,
          pass: `EMAIL_PASSWORD`
        },
      });
      
      const mailOptions = {
        from: 'no-reply@example.com',
        to: `${user.email}`,
        subject: 'Link to Reset Password',
        text: `You are receive this because you (or someone else) requested a password reset on your Conduit user account.
        Please click the following link to complete the process:
        http://localhost:3000/verify-password/${token}`
      };
      
      // send the email
      // transporter.sendMail(mailOptions, (err, res) => {
      //   if (err){
      //     console.error('there was an error sending email', err)
      //   }else {
      //     return res.status(200).json({user: user.toAuthJSON()});
      //   }
      // });

      console.log(`http://localhost:3000/verify-password/${token}`)
      // receive email
      // console.log(req.body.email)

      return res.status(200).json({user: user.toAuthJSON()});

    }
  })
});

router.post('/users/verify-password', function(req, res, next){
  console.log(req.body.password)
  res.status(200).send('success')
});

module.exports = router;
