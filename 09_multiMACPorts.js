"use strict";
var checkAuth = require("./lib/checkAuth");
var pug = require("pug");
var async = require("async");
var models = require("./models");

module.exports = function(app){

  ////////////////////////////////////////////////////////////////////////////////
  app.get("/multiMACPorts", checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };
    res.render("multiMACPortsForm", {
      "title":    "Порты, на которых зарегистрированно несколько MAC-адресов",
      "session":  sAMAccountName,
      "authType": req.session.authType
    });
  });

  ////////////////////////////////////////////////////////////////////////////////
  app.post("/multiMACPorts", checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    if (req.body&&req.body.macsOnPort&&(Number(req.body.macsOnPort) > 1)){
    // db.machistories
    // .aggregate([{$unwind: "$macsArr"}, {$group: {"_id": "$_id", "count": {$sum: 1}}}, {$match: {"count": {$gt:1}} }])
      async.parallel([
        function(callback){
          models.macHistory.aggregate(
            {$unwind: "$macsArr"},
            {$group: {"_id": "$_id", "count": {$sum: 1}}},
            {$match: {"count": { $gte: Number(req.body.macsOnPort)}} }
          ).exec(function(err, histArr) { callback(err, histArr) } );
          // { "_id" : { "switchId" : ObjectId("56092c978e34b6a871c8145e"), "ifIndex" : 23 }, "count" : 5 }
        },
        function(callback){
          models.switches.find({}, function(err, switchArr){
            var switchesObj = {};
            switchArr.forEach(function(switchObjDesc){
              switchesObj[switchObjDesc._id] = switchObjDesc;
            });
            callback(err, switchesObj)
          });
        }
      ]
      ,function (err, result){
        var macsOnPortArr = result[0];
        var switchesObj = result[1];
        var switchList = [];
        macsOnPortArr.forEach(function(macsOnPort){
          switchList.push({
            "switchId":  macsOnPort._id.switchId,
            "ifIndex":  macsOnPort._id.ifIndex,
            "ipaddress": switchesObj[macsOnPort._id.switchId].ipaddress,
            "snmpName": switchesObj[macsOnPort._id.switchId].snmpInfo.snmpName,
            "location": {
              "building": switchesObj[macsOnPort._id.switchId].location.building,
              "floor": switchesObj[macsOnPort._id.switchId].location.floor,
              "room": switchesObj[macsOnPort._id.switchId].location.room
            },
            "count":  macsOnPort.count
          })
        });

        // Сортируем по убыванию количества MAC-адресов на порту
        switchList.sort(function(a,b){
          if (a.count < b.count) return 1;
          if (a.count == b.count) return 0;
          if (a.count > b.count) return -1;
        });

        //console.log(switchList);
        res.render("multiMACPortsResult", {
          "title":      "Порты, на которых зарегистрированно " + req.body.macsOnPort + " или более MAC-адресов",
          "session":    sAMAccountName,
          "authType":   req.session.authType,
          "switchList": switchList
        });

      })
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
