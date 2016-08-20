// Получает список vlan-ов через snmp c коммутатора
  module.exports = function (exchangeEmitter) {
  var config = require("../settings.json");
  var snmp = require("net-snmp");
  var options = {
      port: 161,
      retries: 1,
      timeout: 5000,
      transport: "udp4",
      version: snmp.Version2c
  };

  var session = snmp.createSession (config.rootSwitch, config.community, options);
  var oid = "1.3.6.1.4.1.9.9.46.1.3.1.1.4.1";    // id vlan-ов и описание
  var maxRepetitions = 300;

  function doneCb (error) {
    if (error) {
      console.log("error");
      console.error (error.toString ());
    } else {
      exchangeEmitter.emit("listVlanComplete");
    }
  }

  function feedCb (varbinds) {
    for (var i = 0; i < varbinds.length; i++) {
      if (snmp.isVarbindError (varbinds[i])){
        console.error (snmp.varbindError (varbinds[i]));
      } else {
        var vlanIdx = varbinds[i].oid.replace(oid+".","");
        var vlanDesc = varbinds[i].value.toString();
        if (vlanIdx < config.maxVlan) {
          exchangeEmitter.emit("listVlanEvent", {"id": vlanIdx, "desc": vlanDesc});
        }
      }
    }
  }

  session.subtree (oid, maxRepetitions, feedCb, doneCb);
}
