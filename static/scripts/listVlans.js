window.addEventListener("load", function () {
  // Поиск при нажатии на кнопку
  document.getElementById("getVlans").addEventListener("click", getVlansFn, false);
  // Сохранение при нажатии на кнопку
  document.getElementById("saveVlans").addEventListener("click", saveVlansFn, false);
}, false);

function getVlansFn() {
  // XHR POST
  var req = new XMLHttpRequest();
  req.open("POST", "/getVlans");
  req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  req.send();

  req.onreadystatechange = function() {
    if (req.readyState === 4 && req.status === 200) {
      document.getElementById("crt").innerHTML = req.responseText;
    };
  };
}

function saveVlansFn() {
  var idElms = document.getElementsByName("ids");
  var enabledElms = document.getElementsByName("enabled");
  var descElms = document.getElementsByName("desc");

  var query = [];

  for (var i=0; i < idElms.length; i++){
    if (idElms[i].value){
      query.push({
        "index":       idElms[i].value,
        "enabled":     enabledElms[i].checked,
        "description": descElms[i].value
      });
    }
  }
  if (query.length) {
    // XHR POST
    var req = new XMLHttpRequest();
    req.open("POST", "/saveVlans");
    req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    req.send(JSON.stringify(query));

    req.onreadystatechange = function() {
      if (req.readyState === 4 && req.status === 200) {
        document.getElementById("crt").innerHTML = req.responseText;
      };
    };
  }
}
