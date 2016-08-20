window.addEventListener("load", function () {
  var switchRows = document.getElementsByClassName("switchInfo");
  for( var i=0; i< switchRows.length; i++) {
    switchRows[i].addEventListener("click", switchMACTableFn, false);
  }
}, false);

function switchMACTableFn() {
  // XHR POST
  var req = new XMLHttpRequest();
  req.open("POST", "/showSwitchMACTable");
  req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  req.send(JSON.stringify({"switchId": this.id}));

  req.onreadystatechange = function() {
    if (req.readyState === 4) {
      if (req.status === 500) document.getElementById("crt").innerHTML = req.responseText;
      if (req.status === 200) {
        var resObj = JSON.parse(req.response);
        document.getElementById("crt").innerHTML = resObj.elmHTML;
        document.getElementById("headerLeft").innerHTML = resObj.switchDetail;
      }
    };
  };
}
