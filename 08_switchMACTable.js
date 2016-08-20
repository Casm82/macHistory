"use strict";
var checkAuth = require("./lib/checkAuth");
var pug = require("pug");
var async = require("async");
var models = require("./models");

module.exports = function(app){

  ////////////////////////////////////////////////////////////////////////////////
  app.get("/listSwitchesMACTable", checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };
    res.render("listSwitchesMACTable", {
      "title":    "Список коммутаторов",
      "session":  sAMAccountName,
      "authType": req.session.authType
    });
  });

  ////////////////////////////////////////////////////////////////////////////////
  app.post("/listSwitchesMACTable", checkAuth, function(req, res) {
    if (req.body&&req.body.sort&&req.body.order){
      var sortBy;
      switch (req.body.sort) {
        case "sortByIP":
          sortBy = (req.body.order == "asc")?"ipTxt":"-ipTxt"; break;
        case "sortBySNMPName":
          sortBy = (req.body.order == "asc")?"snmpInfo.snmpName":"-snmpInfo.snmpName"; break;
        case "sortByLocation":
          sortBy = (req.body.order == "asc")?"location.building location.floor location.room":"-location.building location.floor location.room";
          break;
        default: sortBy = "location.building location.floor location.room"; break;
      }
      models.switches
        .find({"enabled": true, "snmpInfo.snmpEnabled": true, "deleted": false})
        .sort(sortBy)
        .exec(function(err, switchArr){
        //console.log(switchArr);
        res.render("elmListSwitchesMACTable", { "switchList": switchArr });
      });
    } else {
      res.status(500).send("Не верный запрос поиска");
    }
  });

  ////////////////////////////////////////////////////////////////////////////////
  app.post("/showSwitchMACTable", checkAuth, function(req, res) {
    if (req.body&&req.body.switchId) {
      var switchId = req.body.switchId.toString()
      async.parallel([
        // информация о коммутаторе
        function(callback){
          models.switches.findById(switchId,
            function(err, switchDetail) { callback(err, switchDetail) }
          )
        },
        // информация о портах коммутатора
        function(callback){
          models.macHistory.find({"_id.switchId": switchId})
            .sort("_id.ifIndex")
            .exec(function(err, switchPortsArr){
              callback(err, switchPortsArr)
            })
        }
        ], function (err, resultArr) {
          if (err) {
            res.status(500).send(err.toString());
          } else {
            var elmSwitchMACTableHead =
              pug.renderFile(__dirname + "/views/elmSwitchMACTableHead.pug", {"switchDetail": resultArr[0]} );
            var elmSwitchMACTableBody =
              pug.renderFile(__dirname + "/views/elmSwitchMACTableBody.pug", {"switchPortsArr": resultArr[1]} );
            res.json({"elmHTML": elmSwitchMACTableBody, "switchDetail": elmSwitchMACTableHead});
          }
        }
      );  // async parallel
    }
  });  // app.post
}
