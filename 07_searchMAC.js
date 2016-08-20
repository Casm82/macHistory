"use strict";
var config = require("./settings.json");
var fs = require("fs");
var checkAuth = require("./lib/checkAuth");
var async = require("async");
var models = require("./models");

module.exports = function(app){

  ////////////////////////////////////////////////////////////////////////////////
  app.get("/searchMAC", checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };
    res.render("searchMACForm", {
      "title":     "Поиск MAC адреса на коммутаторах",
       "session":  sAMAccountName,
       "authType": req.session.authType
    });
  });

  ////////////////////////////////////////////////////////////////////////////////
  app.post("/searchMAC", checkAuth, function(req, res) {
    if (req.body&&req.body.mac) {
      var normMAC = req.body.mac.replace(/[:.]/g,"").toLowerCase();
      if (normMAC.match(/[^0-9a-f+*?^]/)) {
        res.status(500).send("Не верный формат MAC адреса");
      } else {
        res.redirect("/searchMAC/" + req.body.mac.toString().trim().toLowerCase());
      }
    } else {
      res.status(500).send("Не верный запрос");
    }
  });

  ////////////////////////////////////////////////////////////////////////////////
  app.get("/searchMAC/:mac", checkAuth, function(req, res){
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

  // db.machistories.find({'macsArr.mac': '010203abcdef'})
    if (req.params&&req.params.mac) {
      var normMAC = req.params.mac.replace(/[:.]/g,"").toLowerCase();
      if (normMAC.match(/[^0-9a-f+*?^]/)) {
        res.status(500).send("Не верный формат MAC адреса");
      } else {
        var regExpSearch = new RegExp(normMAC);
        var ts = new Date();

        fs.appendFile(config.searchLog,
          `Пользователь ${req.session.username} в ${ts.toLocaleString()} запустил поиск по MAC-адресу ${normMAC}\n`
        );

        models.macHistory
          .find({"macsArr.mac": { "$regex": regExpSearch }})
          .populate("_id.switchId", "ipaddress location snmpInfo")
          .exec(function(err, historyArr){
            res.render("searchMACResult",
              {"historyArr": historyArr,
               "mac":        normMAC,
               "session":    sAMAccountName,
               "authType":   req.session.authType
              })
          })
      }
    } else {
      res.status(500).send("Не верный формат MAC адреса");
    }
  });  // app.post
}
