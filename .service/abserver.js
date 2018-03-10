const express = require('express');
const app = express();

app.use(express.static('.'));

app.use(function(req, res, next) {
  req.url = 'index.html';
  next();
});

app.use(express.static('.'));

app.listen(80, () => console.log('Listening..'))