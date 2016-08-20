var config = require("./settings.json");
var fs = require("fs");
var checkAuth = require("./lib/checkAuth");
var snmpMACtableMode1 = require("./lib/snmpMACtable.mode1.js");
var snmpMACtableMode2 = require("./lib/snmpMACtable.mode2.js");
var async = require("async");
var models = require("./models");
var EventEmitter = require('events').EventEmitter;

module.exports = function(app){

  ////////////////////////////////////////////////////////////////////////////////
  app.get("/collectMAC", checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };
    models.switches.find({"enabled": true, "snmpInfo.snmpEnabled": true, "deleted": false})
      .sort("ipTxt").exec(function(err, switchArr){
      //console.log(switchArr);
      res.render("collectMAC", {
        "title":      "Список коммутаторов",
        "switchList": switchArr,
        "session":    sAMAccountName,
        "authType":   req.session.authType
      });
    });
  });

  ////////////////////////////////////////////////////////////////////////////////
  app.post("/collectMAC", checkAuth, function(req, res) {
    // Функция сохраняет последние зарегистрированные MAC-адреса в журнал
    function saveLastMAC (macObj){
      // { switchId: 55e98ac71a9c07865c5911cb, ifIndex: 22,
      //   vlanId: 80, macHex: '141123421315', ifStatus: 5, error: null
      models.switches.findById(macObj.switchId,
        function(err, switchDetail) {
          var lastDBObj = new models.lastMACs({
            "macHex":         macObj.macHex,
            "switchId":       macObj.switchId.toString(),
            "switchIP":       switchDetail.ipaddress,
            "switchSNMPName": switchDetail.snmpInfo.snmpName,
            "ifIndex":        macObj.ifIndex,
            "vlanId":         macObj.vlanId
          });
          lastDBObj.save(function(err, doc){
            //console.log("в журнал добавлена запись:");
            //console.log(doc);
          });
        }
      );
    };  // saveLastMAC()

    var macEmitter = new EventEmitter();

    async.parallel([
      function(callback){ // получаем список коммутаторов
        models.switches.find({"enabled": true, "snmpInfo.snmpEnabled": true, "deleted": false},
          function (err, switchesArr) { callback(err, switchesArr) } );
      },
      function(callback){ // получаем список vlan-ов
        models.vlans.find({"enabled": true},
          function (err, vlansArr) { callback(err, vlansArr) } );
      }
    ], function (err, results){
      var switchesArr = results[0];
      var vlansArr    = results[1];
      var i=0;  // счётчик обработанных коммутаторов
      if (err) {
        res.send("Возникла ошибка в получении данных из БД");
      } else {
        // Обработка событий от всех коммутаторов
        macEmitter.on("macComplete", function(liveMacsArr) {
        // liveMacsArr:
        //[ { switchId: 55e98ac71a9c07865c5911cb, ifIndex: 22,
        //    vlanId: 80, macHex: '14112121315', ifStatus: 5, error: null }, ... ]

          async.eachSeries(liveMacsArr, function(msg, callback){
            // проверяем, что полученный с коммутатора MAC & Vlan уже есть в базе
            models.macHistory.findById(
              { "switchId": msg.switchId, "ifIndex": msg.ifIndex },
              function (err, macDoc) {
                if (macDoc) {
                  // если есть запись о порте - обновляем
                  var chechIn = macDoc.macsArr.some(function(macDBInfo){
                    return ((macDBInfo.mac == msg.macHex) && (macDBInfo.vlan == msg.vlanId));
                  });
                  // console.log("MAC: %s в БД? : %j", msg.macHex, chechIn);
                  if (chechIn) {
                  // MAC уже в базе данных - следующий шаг
                    callback(null);
                  } else {
                  // MACa нет в базе данных - обновляем её
                    var newMAC = [{ "mac": msg.macHex, "vlan": msg.vlanId, "ts": new Date()}];
                    // console.log("\nЗаписи %j нет в БД для коммутатора %s\n", newMAC, msg.switchId);
                    var joinedMACDoc = newMAC.concat(macDoc.macsArr);

                    models.macHistory.findByIdAndUpdate(
                      { "switchId": msg.switchId, "ifIndex":  msg.ifIndex },
                      { "macsArr":  joinedMACDoc },
                      { "new": true },
                      function (err, saved){
                        // console.log("\nобновлена запись:")
                        // console.log(saved);
                        saveLastMAC(msg);
                        callback(err);
                      });

                  } // checkIn
                } else { // if macDoc
                // MAC нет в БД - сохраняем
                  var macDoc = new models.macHistory({
                    "_id": { "switchId": msg.switchId, "ifIndex":  msg.ifIndex },
                    "macsArr": [{ "mac": msg.macHex, "vlan": msg.vlanId, "ts": new Date()}]
                  });
                  macDoc.save(function(err){
                    //console.log("новая запись: %j", macDoc);
                    fs.appendFile(config.searchLog, "Новая запись:" + JSON.stringify(macDoc) + "\n");
                    saveLastMAC(msg);
                    callback(err);
                  });
                }
              }
            ) // function
          }, function(err) {
            if (err) console.error(err);
            i++;
            if (i == switchesArr.length) {
              res.send("Информация с выбранных коммутаторов получена");
            }
          })  // async each
        });  // event

        switchesArr.forEach(function(switchObj){
          if (switchObj.collectMethod.mode == 0) {
            vlansArr.forEach(function(vlanObj){
              snmpMACtableMode1(macEmitter, switchObj, vlanObj);
            });
          } else {
            snmpMACtableMode2(macEmitter, switchObj);
          }
        });
      } // if (err)
    });
  });  // app.post

}
