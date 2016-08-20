window.addEventListener("load", function () {
  var macValElms = document.getElementsByClassName("macValue");
  for( var i=0; i< macValElms.length; i++) {
    macValElms[i].addEventListener("click", searchMACFn, false);
  }

  var swAddressElms = document.getElementsByClassName("swAddress");
  for( var i=0; i< swAddressElms.length; i++) {
    swAddressElms[i].addEventListener("click", searchSwitchFn, false);
  }

  // поиск по MAC адресу
  function searchMACFn(){
    window.location = "/searchMAC/" + this.textContent;
  }

  // MAC адреса на портах коммутатора
  function searchSwitchFn(){
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
})
