var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var switchesSch = new Schema({
  "_id":        { type: Schema.Types.ObjectId, ref: "macHistory"},
  "enabled":    { type: Boolean, default: true },
  "deleted":    { type: Boolean, default: false },
  "ipaddress":  { type: String, lowercase: true, trim: true },
  "ipTxt":      { type: String, lowercase: true, trim: true },
  "collectMethod":  {
    "mode":          { type: Number, default: 0 },
    "learnedPorts":  { type: Boolean, default: false },
    "excludePorts":  [Number]
  },
  "description": String,
  "snmpInfo":  {
    "snmpEnabled":  { type: Boolean, default: false },
    "snmpName":     { type: String, lowercase: true, trim: true },
    "snmpDecs":     { type: String}
    },
  "location":  {
    "building": { type: String, lowercase: true, trim: true },
    "floor":    { type: String, lowercase: true, trim: true },
    "room":     { type: String, lowercase: true, trim: true }
    }
  }
);

var vlansSch = new Schema({
  "_id":         Number,
  "enabled":     { type: Boolean, default: true },
  "description": String
});

var macHistorySch = new Schema({
  "_id":  {
    "switchId": {type: Schema.Types.ObjectId, ref: "switches"},
    "ifIndex":  Number
  },
  "macsArr":  [],
});

var lastMACsSch = new Schema ({
  "macHex":         { type: String, lowercase: true, trim: true },
  "switchId":       Schema.Types.ObjectId,
  "switchIP":       String,
  "switchSNMPName": String,
  "ifIndex":        Number,
  "vlanId":         Number,
  "ts":             { type: Date, default: Date.now }
  },
  { capped: { size: 10240, max: 20}}
);

exports.switches = mongoose.model("switches", switchesSch);
exports.vlans = mongoose.model("vlans", vlansSch);
exports.macHistory = mongoose.model("macHistory", macHistorySch);
exports.lastMACs = mongoose.model("lastMACs", lastMACsSch);
