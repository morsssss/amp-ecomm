const express = require('express');
const request = require('request');
const path = require('path');
const fs = require('fs');
const productApiManager = require('./ApiManager.js');
const mustache = require("mustache");
const formidableMiddleware = require('express-formidable');

const app = express();

app.use(formidableMiddleware());

app.engine('html', function(filePath, options, callback) {
    fs.readFile(filePath, function(err, content) {
        if (err)
            return callback(err)
        var rendered = mustache.to_html(content.toString(), options);
        return callback(null, rendered)
    });
});
app.set('view engine', 'html');
app.set('views', __dirname + '/../');

const apiManager = new productApiManager();

const port = process.env.PORT || 8080;
const listener = app.listen(port, () => {
    console.log('App listening on port ' + listener.address().port);
});

//serve static files
app.use(express.static(path.join(__dirname, '/../')));

//Product Page
app.get('/product-details', function(req, res) {

    let productId = req.query.productId;
    let productUrl = apiManager.getProductUrl(productId);

    const options = {
        url: productUrl
    };

    request(options, (error, response, body) => {
        if (!error && body != 'Product not found' && !body.includes('An error has occurred')) {
            var productObj = apiManager.parseProduct(body);
            res.render('product-details', productObj);
        } else {
            res.render('product-not-found');
        }
    });
});

//Add to Cart logic
app.post('/add-to-cart', function(req, res) {

    let clientId = req.fields.clientId;
    let productId = req.fields.productId;
    let name = req.fields.name;
    let price = req.fields.price;
    let color = req.fields.color;
    let imgUrl = req.fields.imgUrl;
    let origin = req.get('origin');
    //let quantity = TBD
    let queryParams = "clientId=" + clientId + "&productId=" + productId + "&name=" + name + "&price=" + price + "&color=" + color + "&imgUrl=" + imgUrl;

    //Add product to cart

    //set AMP headers to redirect to cart page
    res.header("Access-Control-Expose-Headers", "AMP-Access-Control-Allow-Source-Origin,AMP-Redirect-To");
    res.header("AMP-Access-Control-Allow-Source-Origin", origin);
    res.header("AMP-Redirect-To", origin + "/cart-details?" + queryParams);

    //return empty response
    res.json({});
});

//Cart Details page
app.get('/cart-details', function(req, res) {

    let cartProduct = apiManager.createCartItem(req.query.productId, req.query.name, req.query.price, req.query.color, req.query.imgUrl);
    let shoppingCart = apiManager.createCart(req.query.clientId);
    shoppingCart.addItem(cartProduct);

    res.render('cart-details', shoppingCart);
});

//API
app.get('/api/categories', function(req, res) {

    let categoryId = req.query.categoryId;
    let sort = req.query.sort;

    let categoryUrl = apiManager.getCategoryUrl(categoryId, sort);
    console.log("Calling Category Url: " + categoryUrl);

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
        if (!error && body != 'Product not found' && !body.includes('An error has occurred')) {
            var productObj = apiManager.parseProduct(body);
            res.send(productObj);
        } else {
            res.json({ error: 'An error occurred in /api/product: ' + body});
        }
    });
});