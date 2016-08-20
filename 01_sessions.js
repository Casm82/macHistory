var config = require("./settings.json");
var fs = require("fs");
var checkAuth = require("./lib/checkAuth");
var fork = require("child_process").fork;
var ActiveDirectory = require("activedirectory");
var ad = new ActiveDirectory(config.ldapConfig);

module.exports = function(app, passport){
  //////////////////////////////////////////////////////////////////////////////////////////
  app.get("/authenticate-negotiate", passport.authenticate('login', {
    successRedirect: "/",
    noUserRedirect:  "/nouser"
  }));

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get("/nouser", function(req, res) {
    res.status(500).end("There was an error in find the user name");
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.post("/login", function(req, res) {
    let username = req.body.username.toString();
    let password = req.body.password.toString();

    // Проверяем имя/пароль
    ad.authenticate(`${username}@${config.domain}`, password, function(err, auth) {
      var authResult = {
        "username":      username,
        "ip":            req.ip,
        "authenticated": auth,
        "authorized":    false,
        "time":          new Date().toLocaleString(),
        "error":         err
      };

      // Проверяем членство в группе доступа
      if (auth) {
        ad.isUserMemberOf(username, config.groupName, function(err, isMember) {
          if (err) throw err;
          if (isMember) {
            // авторизован и есть доступ
            authResult.authorized  = isMember;
            req.session.username   = username;
            req.session.authorized = true;
            res.redirect("/");
          } else {
            // авторизован, но нет в группе для доступа
            req.session.username   = null;
            req.session.authorized = false;
            res.render("authError", {
              username: username,
              code:     403,
              group:    config.groupName
            });
          };
        });
      } else {
        // ошибка авторизации
        req.session.username      = null;
        req.session.authenticated = false;
        req.session.authorized    = false;
        res.render("authError", {
          username: username,
          code:     401,
          group:    config.groupName
        });
      };

      // Записываем в журнал результат авторизации
      fs.appendFile(config.authLog, JSON.stringify(authResult) + "\n");

    });
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get("/logout", checkAuth, function(req, res){
    if (req.session.username) {
      req.session.destroy();
    };
    res.redirect("/");
  });
}
