var listQuery = {"sort": "sortByIP", "order": "asc"};

window.addEventListener("load", function () {
  listSwitchesFn();
}, false);

// Загружает список коммутаторов
function listSwitchesFn(){
  var req = new XMLHttpRequest();
  req.open("POST", "/listSwitchesMACTable");
  req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  req.send(JSON.stringify(listQuery));

  req.onreadystatechange = function() {
    if (req.readyState === 4) {
      if (req.status === 500) document.getElementById("crt").innerHTML = req.responseText;
      if (req.status === 200) {
        document.getElementById("crt").innerHTML = req.responseText;

        // Показывает порты коммутатора при клике по строке
        var switchRows = document.getElementsByClassName("switchData");
        for( var i=0; i< switchRows.length; i++) {
          switchRows[i].addEventListener("click", showSwitchMACTableFn, false);
        }

        // Включаем сортировку
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

function showSwitchMACTableFn() {
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
