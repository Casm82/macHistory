// Получает список vlan-ов через snmp c коммутатора
  module.exports = function (exchangeEmitter, switchObj) {
  var config = require("../settings.json");
  var snmp = require("net-snmp");
  var options = {
      port: 161,
      retries: 1,
      timeout: 5000,
      transport: "udp4",
      version: snmp.Version2c
  };

  var session = snmp.createSession (switchObj.ipaddress, config.community, options);
  var oids = ["1.3.6.1.2.1.1.5.0", "1.3.6.1.2.1.1.1.0"]

  session.get (oids, function (error, varbinds) {
    var result = { "switchID": switchObj._id, "error": null };
    if (error) {
      console.error (error.toString ());
      result.error = error.toString();
    } else {
      for (var i = 0; i < varbinds.length; i++) {
        if (snmp.isVarbindError (varbinds[i])) {
          console.error (snmp.varbindError (varbinds[i]));
        } else {
          var oid = varbinds[i].oid.toString();
          var value = varbinds[i].value.toString().split(/\r\n/)[0];
          result[oid] = value;
        }
      }
    }
    exchangeEmitter.emit("statusEvent", result);
    session.close();
  });

}
