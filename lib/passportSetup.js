var NegotiateStrategy   = require('passport-negotiate').Strategy;
var ActiveDirectory = require("activedirectory");
var config = require("../settings.json");
var ad = new ActiveDirectory(config.ldapConfig);

module.exports = function(passport) {

  passport.serializeUser(function(user, done) {
    done(null, user.cn);
  });

  passport.deserializeUser(function(id, done) {
    ad.findUser(id, function(err, user) {
      if (err) console.log('ERROR: ' +JSON.stringify(err));
      done(err, user);
    });
  });

  passport.use('login',
    new NegotiateStrategy({enableConstrainedDelegation:false}, function(principal, done) {
      let sAMAccountName = principal.replace(/(\d+)@(.*)/, "$1");
      ad.findUser(sAMAccountName, function(err, user) {
        if (err) console.log('ERROR: ' + JSON.stringify(err));
        return done(err, user);
      });
    })
  );
};
