"use strict";
var config = require("./settings.json");
var fs = require("fs");
var checkAuth = require("./lib/checkAuth");
var async = require("async");
var mongoose = require("mongoose");
var models = require("./models");
var EventEmitter = require('events').EventEmitter;

// приводим адрес к формату: 123.12.34.123 -> 123.012.034.123
function txtIP(ip){
  var a=ip.split(".");
  for (var n=0; n < a.length; n++) {
    switch (a[n].length) {
      case 2: a[n]="0" + a[n]; break;
      case 1: a[n]="00" + a[n]; break;
    }
  }
  return a.join(".");
};

// приводим расположение к формату корпус 1 -> корпус 01
function txtLocation(data){
  let result;
  if (data.match(/^\d+/) ) {
    let txt = data.toString();
    switch (txt.length) {
      case 2: result = txt;       break;
      case 1: result = "0" + txt; break;
    }
  } else {
    result = data;
  };
  return result;
};

// преобразуем строку в массив
function normPortsVal(txt){
  var res = [];
  if (txt.match(/[0-9.,;:]+/)){
    var arr = txt.replace(/[.;: ]/g,",").split(",");
    arr.forEach(function(port){
      if (Number(port) >= 0) res.push(Number(port));
    })
  }
  return res;
}

module.exports = function(app){

  ////////////////////////////////////////////////////////////////////////////////
  app.get("/listSwitches", checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    res.render("listSwitchesEdit", {
      "title":    "Список коммутаторов",
      "session":  sAMAccountName,
      "authType": req.session.authType
    });
  });

  ////////////////////////////////////////////////////////////////////////////////
  app.post("/listSwitches", checkAuth, function(req, res) {
    if (req.body&&req.body.sort&&req.body.order){
      var sortBy;
      switch (req.body.sort) {
        case "sortByEnable":
          sortBy = (req.body.order == "asc")?"-enabled ipTxt":"enabled ipTxt"; break;
        case "sortByIP":
          sortBy = (req.body.order == "asc")?"ipTxt":"-ipTxt"; break;
        case "sortByLocation":
          sortBy = (req.body.order == "asc")?"location.building location.floor location.room":"-location.building location.floor location.room";
          break;
        default: sortBy = "location.building location.floor location.room"; break;
      }

      models.switches
        .find({"deleted": false})
        .sort(sortBy)
        .exec(function(err, switchArr){
        //console.log(switchArr);
        res.render("elmListSwitchesEdit", { "switchList":  switchArr });
      });
    } else {
      res.status(500).send("Не верный запрос поиска");
    }
  });

  ////////////////////////////////////////////////////////////////////////////////
  app.post("/saveSwitches", checkAuth, function(req, res) {
    var switchesDescArr = req.body;

    async.eachSeries(switchesDescArr, function(switchObj, callback){
      if (switchObj.ipaddress.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)){
        var switchObjFix = {
          "enabled":        switchObj.enabled,
          "deleted":        switchObj.deleted,
          "ipaddress":      switchObj.ipaddress,
          "ipTxt":          txtIP(switchObj.ipaddress),
          "description":    switchObj.description,
          "collectMethod":  {
              "mode":          switchObj.collectMethod.mode,
              "learnedPorts":  switchObj.collectMethod.learnedPorts,
              "excludePorts":  normPortsVal(switchObj.collectMethod.excludePorts)
          },
          "location": {
              "building":      txtLocation(switchObj.location.building),
              "floor":         txtLocation(switchObj.location.floor),
              "room":          switchObj.location.room
           }
        };
        //console.log(switchObjFix);
        if (switchObj.switchId) {
          models.switches.findByIdAndUpdate(switchObj.switchId,
            { $set: switchObjFix },
            { "upsert": false },
            function (err) { callback(err) }
          );
        } else {
          switchObjFix._id = new mongoose.Types.ObjectId;
          var switchMongo  = new models.switches(switchObjFix);
          switchMongo.save(function(err, doc) {
            //console.log(doc);
            callback(err);
          });
        };
      } else {
        callback("неверный формат ip-адреса");
      }
    }, function(err){
      if (err) {
        console.error(err);
        res.status(500).send("Возникла ошибка при сохранении списка коммутаторов: " + err);
      } else {
        // Удаляем коммутаторы
        async.waterfall([
          // Поиск коммутаторов с меткой deleted
          function(callback){
            models.switches.find({"deleted": true}, "_id", function(err, delSwitches){
              callback(err, delSwitches);
            });
          },
          // проверка, что у коммутаторов с меткой deleted
          // нет записей в истории mac адресов
          function(delSwitches, callback){
            var switchHistRecObj = {};
            async.eachSeries(delSwitches, function(switchObj, callbackEach){
              models.macHistory.count({"_id.switchId": switchObj._id},
              function(err, histRecs){
                switchHistRecObj[switchObj._id] = histRecs;
                callbackEach(err);
              })
            }, function(err){
              //console.log(switchHistRecObj);
              callback(err, switchHistRecObj);
            })  // async.each
          },
          // Удаляем коммутаторы, если нет истории
          function(switchHistRecObj, callback){
          /*{ '5603c60536754bda38957eea': 13,
              '56090bfd90f942961d230b5b': 0 } */
            var delIdArr = [];
            for (var delId in switchHistRecObj) {
              if (switchHistRecObj[delId] == 0 ) delIdArr.push(delId);
            }
            async.eachSeries(delIdArr, function(delId, callbackEach){
              models.switches.findByIdAndRemove(delId,
              function(err) {
                fs.appendFile(config.searchLog, "Удалены коммутаторы:" + JSON.stringify(delId) + "\n");
                callbackEach(err);
              })
            },
              function(err){ callback(err); }
            );
          }
        ], function (err) {
          res.status(200).send("Все описания коммутаторов успешно сохранены");
        });
      } // if - else
    });  //async.each
  }); // app.post

}
