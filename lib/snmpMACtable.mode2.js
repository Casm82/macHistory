// Получает список MAC адресов через snmp c коммутатора без учёта vlan
// dot1dTpFdbStatus: other(1), invalid(2), learned(3), self(4), mgmt(5)
// session.subtree(MAC table) ---> subtree(ifStatus table) ---> Emit
module.exports = function (exchangeEmitter, switchObj) {
  var config = require("../settings.json");
  var snmp = require("net-snmp");
  var hexMac = require("./hexMac");
  var options = {
      port: 161,
      retries: 1,
      timeout: 5000,
      transport: "udp4",
      version: snmp.Version2c
  };

  var session = snmp.createSession (switchObj.ipaddress, config.community, options);

  ////////////////////////////////////////////////////////////////////////////////
  var oid = "1.3.6.1.2.1.17.4.3.1.2";    // таблица MAC-адресов
  // snmpbulkwalk -v 2c -c community -OXqs 192.168.1.244 .1.3.6.1.2.1.17.4.3.1.2
  // mib-2.17.4.3.1.2.0.7.180.0.80.1 49
  // mib-2.17.4.3.1.2.0.23.223.122.249.128 49

  var ifStatOid = "1.3.6.1.2.1.17.4.3.1.3";    // статус интерфейсов
  // snmpbulkwalk -v 2c -c community -OXqs -m BRIDGE-MIB 192.168.1.244 .1.3.6.1.2.1.17.4.3.1.3
  // dot1dTpFdbStatus[44:8a:5b:82:b1:71] learned
  // dot1dTpFdbStatus[44:8a:5b:82:b3:a5] mgmt
  // 1.3.6.1.2.1.17.4.3.1.3.68.138.91.130.180.20|5
  // 1.3.6.1.2.1.17.4.3.1.3.68.138.91.141.85.86|3

  var maxRepetitions = 300;
  var liveMACsArr   = [];    // массив с MAC адресами на портах
  var liveIfStatArr = [];  // массив статусов портов
  var liveMgmtMACs  = [];  // массив портов с MAC адресами у которых статусы mgmt

  ////////////////////////////////////////////////////////////////////////////////
  function ifStatDoneCb (error) {
    /*if (error) {
      console.error("Ошибка SNMP: switch: %s, error: %s", switchObj.ipaddress, error.message);
    }*/
    //console.log(switchObj);
    liveMACsArr.forEach(function(macInfo){
      liveIfStatArr.forEach(function(ifStat){
        if (
            (ifStat.switchId == macInfo.switchId) &&
            (ifStat.macDec == macInfo.macDec) &&
            ( // у порта статус mgmt, у коммутатора выключен learnConnect или
              // у коммутатора включен learnCollect и порта нет в исключениях
              (ifStat.ifStatus == config.mgmtStatus) && (!switchObj.collectMethod.learnedPorts) ||    // статус порта mgmt
              ( switchObj.collectMethod.learnedPorts &&    // записывать все статусы?
                (switchObj.collectMethod.excludePorts.indexOf(macInfo.ifIndex) == -1 )  // исключать порт?
              )
            )
          ) {
              var liveMgmtIf = {
                "switchId":  macInfo.switchId,
                "vlanId":    null,
                "ifIndex":   macInfo.ifIndex,
                "macHex":    macInfo.macHex,
                "ifStatus":  ifStat.ifStatus,
                "error":     ifStat.error&&macInfo.error
              };
              //console.log(liveMgmtIf);
              liveMgmtMACs.push(liveMgmtIf);
        }
      });
    });
    //console.log("\n switch: %s - %s", switchObj.ipaddress, switchObj._id);
    //console.log(liveMgmtMACs);
    exchangeEmitter.emit("macComplete", liveMgmtMACs);
    session.close();
  }
  ////////////////////////////////////////////////////////////////////////////////
  function ifStatFeedCb (varbinds) {
    for (var i = 0; i < varbinds.length; i++) {
      var result = {
          "switchId": switchObj._id,
          "vlanId":   null,
          "error":    null
      };

      if (snmp.isVarbindError (varbinds[i])){
        //console.error (snmp.varbindError (varbinds[i]));
        result.error = error.toString();
        //console.error("\nif get error");
      } else {
        result.macDec = varbinds[i].oid.replace(ifStatOid+".","");
        result.ifStatus = varbinds[i].value;
        liveIfStatArr.push(result);
      }
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  function macDoneCb (error) {
    /*if (error) {
      console.log("Ошибка в получении mac-адреса: vlan: %s, switch: %s, err: %s",
        vlanObj._id, switchObj.ipaddress, error.message);
    }*/
    session.subtree (ifStatOid, maxRepetitions, ifStatFeedCb, ifStatDoneCb);
  }

  ////////////////////////////////////////////////////////////////////////////////
  function macFeedCb (varbinds) {
    for (var i = 0; i < varbinds.length; i++) {
      var result = {
          "switchId": switchObj._id,
          "vlanId":   null,
          "error":    null
      };

      if (snmp.isVarbindError (varbinds[i])){
        //console.error (snmp.varbindError (varbinds[i]));
        result.error = error.toString();
        //console.error("\nget error");
      } else {
        result.macDec = varbinds[i].oid.replace(oid+".","");
        result.macHex = hexMac(result.macDec);
        result.ifIndex = varbinds[i].value;
        //console.log(result);
        liveMACsArr.push(result);
      }
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  session.subtree (oid, maxRepetitions, macFeedCb, macDoneCb);
}
