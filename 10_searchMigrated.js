"use strict";
var checkAuth = require("./lib/checkAuth");
var async = require("async");
var models = require("./models");

module.exports = function(app){

  ////////////////////////////////////////////////////////////////////////////////
  app.get("/searchMigrated", checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    async.waterfall([
      function(callback){
        models.macHistory.aggregate(
          {$unwind: "$macsArr"},
          {$group: {"_id": "$macsArr.mac", "count": {$sum: 1}}},
          {$match: {"count": { $gte: 2 }} }
        ).exec(function(err, histArr) {
          var multiMACArr = [];
          histArr.forEach(function(obj) { multiMACArr.push(obj._id)});
          callback(err, multiMACArr.sort());
        });
      },
      function(multiMACArr,callback){
        var macInfoObj = {};
        async.eachSeries(multiMACArr, function(mac, cbSeries){
          models.macHistory
          .find({"macsArr.mac": mac})
          .populate("_id.switchId", "ipaddress location snmpInfo")
          .exec(function(err, historyArr){
            macInfoObj[mac] = [];
            historyArr.forEach(function(historyRec){
              historyRec.macsArr.forEach(function(macHist){
                if (macHist.mac == mac) {
                  var macInfoItem = {
                    "switchId":    historyRec._id.switchId._id,
                    "ifIndex":    historyRec._id.ifIndex,
                    "ipaddress":  historyRec._id.switchId.ipaddress,
                    "location":    historyRec._id.switchId.location,
                    "snmpName":    historyRec._id.switchId.snmpInfo.snmpName,
                    "vlan":        macHist.vlan,
                    "ts":          macHist.ts
                  };
                  macInfoObj[mac].push(macInfoItem);
                }
              });
            })
            function sortByTS (a,b) {
              if (a.ts < b.ts) return 1;
              if (a.ts == b.ts) return 0;
              if (a.ts > b.ts) return -1;
            }
            // сортируем по времени
            macInfoObj[mac].sort(sortByTS);
            cbSeries(err);
          })
        }, function(err){ callback(err, macInfoObj) });
      }
    ]
    ,function (err, result){
      res.render("searchMigrated", {
        "title":        "История перемещений MAC-адресов",
        "session":      sAMAccountName,
        "authType":     req.session.authType,
        "listMigrated": result
      });
    })
});

}
