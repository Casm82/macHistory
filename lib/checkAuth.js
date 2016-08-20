"use strict";
module.exports = function (req, res, next) {
  let authType;
  if ( req.headers && req.headers["user-agent"] ) {
    let userAgent = req.headers["user-agent"];
    if (userAgent.match(/Firefox/)) authType = "ldap";
    if (userAgent.match(/Chrome/))  authType = "krb";
    if (userAgent.match(/Trident/)) authType = "krb";
    if (!authType) authType = "ldap";
  } else {
    authType = "ldap";
  };

  //authType = "ldap";
  req.session.authType = authType;

  if (authType == "krb") {
    //console.log("check for authenticated principal: %s", req.session.authenticatedPrincipal);
    if (!req.session.passport) {
      res.redirect("/authenticate-negotiate");
      return;
    } else {
      next();
    }
  }

  if (authType == "ldap") {
    if (req.session.username && req.session.authorized) {
      next();
    } else {
      if (req.ip.match(/127\.0\.0\.1/)) {
        next ();
      } else {
        res.render("login", { title: "Вход"});
      }
    }
  }

}
