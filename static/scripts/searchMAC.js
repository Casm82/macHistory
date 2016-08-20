window.addEventListener("load", function () {
  document.getElementById("search").addEventListener("click", searchMACFn, false);

  document.getElementById("clear").addEventListener("click", function(){
    document.getElementById("macValue").value="";
  }, false);

}, false);

function searchMACFn() {
  // XHR POST
  var req = new XMLHttpRequest();
  req.open("POST", "/searchMAC");
  req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  var macValue = document.getElementById("macValue").value;
  if (macValue) {
    req.send(JSON.stringify({"mac": macValue}));

    req.onreadystatechange = function() {
      if (req.readyState === 4) {
        if (req.status === 200) document.getElementById("crt").innerHTML = req.responseText;
        if (req.status === 500) document.getElementById("crt").innerHTML = req.responseText;
      };
    };
  }
}
