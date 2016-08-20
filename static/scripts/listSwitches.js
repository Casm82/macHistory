var listQuery = {"sort": "sortByIP", "order": "asc"};

window.addEventListener("load", function () {
  // Сохранение при нажатии на кнопку
  document.getElementById("saveSwitches").addEventListener("click", saveSwitchesFn, false);
  // Добавление коммутатора при нажатии на кнопку
  document.getElementById("addSwitches").addEventListener("click", addSwitchFn, false);
  listSwitchesFn();
}, false);

// Загружает список коммутаторов
function listSwitchesFn(){
  var req = new XMLHttpRequest();
  req.open("POST", "/listSwitches");
  req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  req.send(JSON.stringify(listQuery));

  req.onreadystatechange = function() {
    if (req.readyState === 4) {
      if (req.status === 500) document.getElementById("crt").innerHTML = req.responseText;
      if (req.status === 200) {
        document.getElementById("crt").innerHTML = req.responseText;
        clearCheckBoxesFn();
        enableExcludeInputFn();
        var sortableElms = document.getElementsByClassName("sortable");

        for(var i=0; i < sortableElms.length; i++){
          if (sortableElms[i].dataset.sort == listQuery.sort) {
            if (listQuery.order == "asc") {
              sortableElms[i].style.backgroundColor = "lime";
            } else {
              sortableElms[i].style.backgroundColor = "yellow";
            }
          } else {
            sortableElms[i].style.backgroundColor = "inherit";
          }

          sortableElms[i].addEventListener("click", function() {
            if (this.dataset.sort == listQuery.sort) {
              if (listQuery.order == "asc")
                listQuery.order = "desc"
              else
                listQuery.order = "asc"
              } else {
                listQuery.sort = this.dataset.sort;
                listQuery.order = "asc"
              };
            listSwitchesFn();
          }, false);
        }
      }
    };
  }
}

// Включает/отключает поле исключения портов в зависимости от галочки "Все статусы портов"
function setVisible(){
  this.parentNode.parentNode.childNodes[5].firstChild.disabled = !this.checked;
}

function enableExcludeInputFn (){
  var metodElms = document.getElementsByName("collectMethod");
  for (var i=0; i < metodElms.length; i++){
    metodElms[i].addEventListener("change", setVisible, false);
  }
}

// Снимает галочки с поля удаления при обновлении страницы
function clearCheckBoxesFn(){
  var checkboxes = document.getElementsByTagName("input");
  for (var i=0; i < checkboxes.length; i++) {
    if (checkboxes[i].name == "delSwitch") checkboxes[i].checked = false;
  }
}

// Добавляет поля для нового коммутатора
function addSwitchFn(){
  var templateElm = document.getElementById("switchTemplate");
  var newtrElm = document.createElement("tr");
  newtrElm.innerHTML = templateElm.innerHTML;
  newtrElm.childNodes[4].firstChild.addEventListener("change", setVisible, false);

  var switchTableElm = document.getElementById("switchesTable");
  switchesTable.appendChild(newtrElm);
  newtrElm.scrollIntoView();
}

// Проверяет введённые ip-адреса на дубликаты
function checkDupsFn(){
  var ipObj = {};
  var ipInputElms = document.getElementsByClassName("ip");
  for(var i=0; i < ipInputElms.length; i++){
    var ip = ipInputElms[i].value;
    if (ip) {
      if (ipObj[ip]) {
        ipInputElms[i].value = "ip уже существует";
        return true;
      } else {
        ipObj[ip] = true;
      };
    }
  }
  return false;
}

// Передаёт на сервер введёные коммутаторы
function saveSwitchesFn() {
  var dups = checkDupsFn();
  if (!dups) {
    var ipElms = document.getElementsByName("ipaddress");
    var modeElms = document.getElementsByName("mode");
    var methodElms = document.getElementsByName("collectMethod");
    var excludeElms = document.getElementsByName("excludePorts");
    var buildingElms = document.getElementsByName("building");
    var floorElms = document.getElementsByName("floor");
    var roomElms = document.getElementsByName("room");
    var descElms = document.getElementsByName("description");
    var enabledElms = document.getElementsByName("enabled");
    var deletedElms = document.getElementsByName("delSwitch");

    var query = [];
    for (var i=0; i < ipElms.length; i++){
      if (ipElms[i].value){
        query.push({
          "switchId":  ipElms[i].id?ipElms[i].id:null,
          "enabled":      enabledElms[i].checked,
          "deleted":      deletedElms[i].checked,
          "collectMethod":  {
            "mode":          modeElms[i].value,
            "learnedPorts":  methodElms[i].checked,
            "excludePorts":  excludeElms[i].value
          },
          "ipaddress":    ipElms[i].value,
          "description":  descElms[i].value,
          "location":  {
            "building":  buildingElms[i].value,
            "floor":    floorElms[i].value,
            "room":      roomElms[i].value
            }
        });
      }
    }
    if (query.length) {
      // XHR POST
      var req = new XMLHttpRequest();
      req.open("POST", "/saveSwitches");
      req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
      req.send(JSON.stringify(query));

      req.onreadystatechange = function() {
        if (req.readyState === 4) {
          if (req.status === 200) document.getElementById("crt").innerHTML = req.responseText;
          if (req.status === 500) document.getElementById("crt").innerHTML = req.responseText;
        };
      };
    }
  }
}
