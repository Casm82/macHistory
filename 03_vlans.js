module.exports = function(app){
  var checkAuth = require("./lib/checkAuth");
  var snmpWalkVlan = require("./lib/snmpWalkVlans.js");
  var async = require("async");
  var models = require("./models");
  var EventEmitter = require('events').EventEmitter;

  ////////////////////////////////////////////////////////////////////////////////
  app.get("/listVlans", checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    models.vlans.find({}).sort("_id").exec(function(err, vlanArr){
      //console.log(vlanArr);
      res.render("listVlans", {
        "title":    "Список vlan-ов",
        "vlanList": vlanArr,
        "session":  sAMAccountName,
        "authType": req.session.authType
      });
    });
  });

  ////////////////////////////////////////////////////////////////////////////////
  app.post("/getVlans", checkAuth, function(req, res) {
    var vlanEmitter = new EventEmitter();
    var vlansArr = [];

    vlanEmitter.on("listVlanEvent", function(msg) {
      //console.log(msg);
      vlansArr.push(msg);
    });

    vlanEmitter.on("listVlanComplete", function() {
      //console.log("Все vlan-ы получены");
      res.render("elmListVlans", {"vlanList": vlansArr});
    });
    snmpWalkVlan(vlanEmitter);
  });

  ////////////////////////////////////////////////////////////////////////////////
  app.post("/saveVlans", checkAuth, function(req, res) {
    var vlansDescArr = req.body;
    async.eachSeries(vlansDescArr, function(vlanObj, callback){

      models.vlans.findByIdAndUpdate(vlanObj.index,
        { $set: { "description": vlanObj.description, "enabled": vlanObj.enabled } },
        { "upsert": true },
        function (err) { callback(err) }
      );

    }, function(err){
        if (err) {
          res.status(500).send("Возникла ошибка при сохранении списка vlan-ов");
        } else {
          res.status(200).send("Все vlan-ы успешно сохранены");
        }
    }); //async
  });

  ////////////////////////////////////////////////////////////////////////////////
}
