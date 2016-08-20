module.exports = function(app){
  var checkAuth = require("./lib/checkAuth");
  var snmpStatusSwitch = require("./lib/snmpStatusSwitch.js");
  var async = require("async");
  var models = require("./models");
  var EventEmitter = require('events').EventEmitter;

  ////////////////////////////////////////////////////////////////////////////////
  app.get("/statusSwitches", checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };
    models.switches.find({"deleted": false}).sort("ipTxt").exec(function(err, switchArr){
      //console.log(switchArr);
      res.render("statusSwitches", {
        "title":      "Список коммутаторов",
        "switchList": switchArr,
        "session":    sAMAccountName,
        "authType":   req.session.authType
      });
    });
  });

  ////////////////////////////////////////////////////////////////////////////////
  app.post("/statusSwitches", checkAuth, function(req, res) {
    var statusEmitter = new EventEmitter();
    // получаем список коммутаторов
    models.switches.find({"enabled": true, "deleted": false}, function (err, switchArr) {
      if (err) {
        res.send("Возникла ошибка в получении данных из БД");
      } else {
        var completed = 0;
        statusEmitter.on("statusEvent", function(msg) {
          //console.log("\nevent: %j", msg)
            var snmpMongo;
            if (msg.error) {
              snmpMongo = {
                "snmpInfo.snmpEnabled":  false,
                "snmpInfo.snmpName":    null,
                "snmpInfo.snmpDecs":    msg.error
                };
            } else {
              snmpMongo = {
                "snmpInfo.snmpEnabled":  true,
                "snmpInfo.snmpName":    msg["1.3.6.1.2.1.1.5.0"],
                "snmpInfo.snmpDecs":    msg["1.3.6.1.2.1.1.1.0"]
                };
            };

            // сохраняем данные из snmp в БД
            models.switches.findByIdAndUpdate(msg.switchID, {$set: snmpMongo },
              function(err, saved) {
                completed++;
                //console.log("saved %s", saved.ipaddress);
                if (completed == switchArr.length) {
                  //console.log("Статус SNMP-службы у коммутаторов проверен");
                  res.send("Статус SNMP-службы у выбранных коммутаторов проверен");
                }
              })
        });

        switchArr.forEach(function(switchObj){
          snmpStatusSwitch(statusEmitter, switchObj);
        });
      } // if (err)
    }); // find switches
  });

}
