#!/bin/env node
var config = require("./settings.json");
var express = require("express");
var middlewares = require("express-middlewares");
var session = require("express-session");
var MongoDBStore = require('connect-mongodb-session')(session);
var https = require("https");
var mongoose = require("mongoose");
var path = require("path");
var fs = require("fs");
var app = express();
var passport = require("passport");
var passportSetup = require("./lib/passportSetup");

// Параметры HTTPS сервера
var sslcert = {
  key:  fs.readFileSync(__dirname + "/cert/key.pem"),
  cert: fs.readFileSync(__dirname + "/cert/cert.pem")
};

// Параметры Express
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.set("x-powered-by", false);
app.use(middlewares.favicon(__dirname + "/static/images/favicon.png"));
app.use(middlewares.bodyParser());
app.use(express.static(path.join(__dirname, "static")));

//var crypto = require("crypto");
//var cookieSecret = crypto.randomBytes(32).toString("base64");
var cookieSecret = "3JQrrviRsGJXsmFdL1uW4B48uihOfGW04UmnbY=";

app.use(middlewares.cookieParser(cookieSecret));

var store = new MongoDBStore({
  uri: config.mongoConnection,
  collection: 'sessions'
});

app.use(session({
  "secret":  cookieSecret,
  "name":    "mac.sid",
  "resave":  false,
  "saveUninitialized": false,
  "cookie": { maxAge: 2592000000, secure: true },
  "store":  store
}));

app.use(passport.initialize());
app.use(passport.session());

// Подключаемся к MongoDB
mongoose.connect(config.mongoConnection, function (err) {
  if (err) throw err;
  console.log("Подключились к MongoDB");
  passportSetup(passport);

  // Проходим по маршрутам
  require("./01_sessions.js")(app, passport);
  require("./02_selectTask.js")(app);
  require("./03_vlans.js")(app);
  require("./04_switches.js")(app);
  require("./05_status.js")(app);
  require("./06_collectMAC.js")(app);
  require("./07_searchMAC.js")(app);
  require("./08_switchMACTable.js")(app);
  require("./09_multiMACPorts.js")(app);
  require("./10_searchMigrated.js")(app);
  require("./99_errorHandlers.js")(app);

  https.createServer(sslcert, app).listen(config.port, function() {
    console.log("Express сервер ожидает подключений по адресу https://" + process.env.HOSTNAME + ":" + config.port);
  });
});
