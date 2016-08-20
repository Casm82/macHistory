window.addEventListener("load", function () {
  document.getElementById("checkSwitches").addEventListener("click", checkSwitchesFn, false);
}, false);

function checkSwitchesFn() {
  var startBtn = this;
  startBtn.disabled=true;
  // XHR POST
  var req = new XMLHttpRequest();
  req.open("POST", "/statusSwitches");
  req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  req.send();

  req.onreadystatechange = function() {
    if (req.readyState === 4) {
      if (req.status === 200) {
        document.getElementById("crt").innerHTML = req.responseText;
        startBtn.disabled=false;
      }
      if (req.status === 500) document.getElementById("crt").innerHTML = req.responseText;
    };
  };
}
