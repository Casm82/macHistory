var checkAuth = require("./lib/checkAuth");
var models = require("./models");
var async = require("async");

module.exports = function(app){
  ////////////////////////////////////////////////////////////////////////////////
  app.get("/", checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    async.parallel([
      // кол-во MAC-адресов:
      function(callback){
        // db.machistories.aggregate([{$unwind: "$macsArr"}, {$group: {"_id": null, "count": {$sum: 1}}}])
        models.macHistory.aggregate(
          {$unwind: "$macsArr"},
          {$group: {"_id": null, "count": {$sum: 1}}},
          function(err, aggrResult) { callback(err, aggrResult[0].count) }
        );
      },
      // кол-во коммутаторов
      function(callback){
        models.switches.count({"enabled": true, "deleted": false},
          function (err, switchCount) { callback(err, switchCount) }
        )
      },
      // последние найденные адреса
      function(callback){
        models.lastMACs.find().sort("-ts").exec(function (err, lastMACsArr){
          callback(err, lastMACsArr);
        });
      }
    ],
      function (err, results){
        res.render("selectTask", {
          "title":    "История MAC-адресов на портах коммутаторов",
          "stats":    { "macsCount": results[0], "switchCount": results[1]},
          "lastMACs": results[2],
          "session":  sAMAccountName,
          "authType": req.session.authType
        });
      }
    )
  });

  ////////////////////////////////////////////////////////////////////////////////
  app.get("/app", checkAuth, function(req, res) {
    res.redirect("/");
  });
  ////////////////////////////////////////////////////////////////////////////////
}
