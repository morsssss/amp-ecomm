const express = require('express');
const request = require('request');
const path = require('path');
const fs = require('fs');
const productApiManager = require('./ApiManager.js');

const app = express();
const apiManager = new productApiManager();

const port = process.env.PORT || 8080;
const listener = app.listen(port, () => {
    console.log('App listening on port ' + listener.address().port);
});

//serve static files
app.use(express.static(path.join(__dirname, '../..')));

//API
app.get('/api/categories', function(req, res) {

    let categoryId = req.query.categoryId;
    let sort = req.query.sort;

    let categoryUrl = apiManager.getCategoryUrl(categoryId, sort);

    const options = {
        url: categoryUrl
    };

    request(options, (error, response, body) => {
        if (!error) {
            res.send(apiManager.parseCategory(body));
        } else {
            res.json({ error: 'An error occurred in /api/categories' });
        }
    });
});

app.get('/api/product', function(req, res) {

    let productId = req.query.productId;
    let productUrl = apiManager.getProductUrl(productId);

    const options = {
        url: productUrl
    };

    request(options, (error, response, body) => {
        if (!error) {
            res.send(body);
        } else {
            res.json({ error: 'An error occurred in /api/product' });
        }
    });
});