const express = require('express');
const request = require('request');
const path = require('path');
const fs = require('fs');
const backend = require('./Backend.js');

const app = express();
const ecommBackend = new backend();

const port = process.env.PORT || 8080;
const listener = app.listen(port, () => {
  console.log('App listening on port ' + listener.address().port);
});

//serve static files
app.use(express.static(path.join(__dirname,'../..')));

//API
app.get('/api/categories', function (req, res) {

  var categoryId = req.query.categoryId;
  var sort = req.query.sort;
  var categoryUrl = ecommBackend.getCategoryUrl(categoryId, sort);

  var categoryListing = getCategory(categoryUrl);

  res.send(categoryListing);

});

app.get('/api/product', function (req, res) {

  var productId = req.query.productId;
  var productUrl = ecommBackend.getProductUrl(productId);

  var product = getProduct(productUrl);

  res.send(product);

});

function getCategory(categoryUrl) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, categoryUrl), 'utf8'));
}

function getProduct(productId) {
  //use case not yet available on the bike shop API
}