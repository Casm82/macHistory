// Преобразует dec mac в hex mac
module.exports = function hexMac(macDec){
  var hexDig = "0123456789abcdef";
  var macHexArr = [];
  var macDecArr = macDec.split(".");

  macDecArr.forEach(function(decWord){
    var a = [];
    if (decWord > 15) {
      while (decWord > 15) {
        a.push(hexDig[decWord % 16]);
        decWord = decWord >> 4;
      }
      a.push(hexDig[decWord]);
    } else {
      a.push(hexDig[decWord]);
      a.push("0");
    }
    macHexArr.push(a.reverse().join(""));
  });
  return macHexArr.join("");
}
