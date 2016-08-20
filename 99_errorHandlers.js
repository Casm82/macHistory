module.exports = function(app){
  app.use(function (req, res, next) {    // 404s
    if (req.accepts('html')) {
      return res.status(404).send("<h2>Извините, но я не могу найти эту страницу.</h2>");
    }
    if (req.accepts('json')) {
      return res.json({ error: 'Not found' });
    }
    // default response type
    res.type('txt');
    res.status(404).send("Не могу найти страницу.");
  })

  app.use(function (err, req, res, next) {    // 500
    console.error('error at %s\n', req.url, err.stack);
    res.status(500).send("<h2>Обнаружена ошибка в работе сервера. Обратитесь к Администратору.</h2>");
  })
}
