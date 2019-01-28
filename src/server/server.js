const express = require('express');
const request = require('request');
const path = require('path');
const fs = require('fs');
const productApiManager = require('./ApiManager.js');
const mustache = require("mustache");
const formidableMiddleware = require('express-formidable');
const memCache = require('memory-cache');

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

//Product Listing Page
app.get('/product-listing', function(req, res) {
    let productsCategory = req.query.productsCategory;
    let listingUrl = apiManager.getCategoryUrl(productsCategory);
    // defaults to women-shirts
    let resProductsGender = 'women';
    let resProductsCategory = 'women-shirts';
    let resShirtSelected = 'selected';
    let resShortSelected = '';

    if (!listingUrl.match('categoryId=undefined')) {
        resProductsCategory = productsCategory;
        if (!resProductsCategory.match('women')) {
            resProductsGender = 'men';
        }
        if (!resProductsCategory.match('shirt')) {
            resShirtSelected = '';
            resShortSelected = 'selected';
        }
    } 
    mustache.tags = ['<%','%>'];
    res.render('product-listing', {
        productsCategory: resProductsCategory,
        productsGender: resProductsGender,
        shirtSelected: resShirtSelected,
        shortSelected: resShortSelected
    });
});

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
            mustache.tags = ['{{','}}'];
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
    let size = req.fields.size;
    let imgUrl = req.fields.imgUrl;
    let origin = req.get('origin');
    let quantity = req.fields.quantity;

    let cartProduct = apiManager.createCartItem(productId, name, price, color, size, imgUrl, quantity);
    let shoppingCart = memCache.get(clientId);

    if(!shoppingCart) {
        shoppingCart = apiManager.createCart(clientId);
    }

    shoppingCart.addItem(cartProduct);
    memCache.put(clientId, shoppingCart, 60*60*60*1000);

    //set AMP headers to redirect to cart page
    res.header("Access-Control-Expose-Headers", "AMP-Access-Control-Allow-Source-Origin,AMP-Redirect-To");
    res.header("AMP-Access-Control-Allow-Source-Origin", origin);
    res.header("AMP-Redirect-To", origin + "/cart-details.html");

    //amp-form requires json response
    res.json({});
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

app.get('/api/cart-items', function(req, res) {

    let clientId = req.query.clientId;
    let shoppingCart = memCache.get(clientId);

    if(!shoppingCart) {
        shoppingCart = apiManager.createCart(clientId);
        memCache.put(clientId, shoppingCart, 60*60*60*1000);   
    }

    //wrap the shopping cart into an 'items' array, so it can be consumed with amp-list.
    let shoppingCartResponse = {items : []};
    shoppingCartResponse.items.push(shoppingCart);

    res.send(shoppingCartResponse);
});

app.post('/api/delete-cart-item', function(req, res) {

    let clientId = req.fields.clientId;
    let productId = req.fields.productId;
    let color = req.fields.color;
    let size = req.fields.size;

    let shoppingCartResponse = {items : []};

    let shoppingCart = memCache.get(clientId);

    if(shoppingCart) {
         shoppingCart.removeItem(productId, color, size);
         shoppingCartResponse.items.push(shoppingCart);
    }

    enableCors(req, res);
    res.send(shoppingCartResponse);
});

function enableCors(req, res) {

  //set to all for dev purposes only, change it by configuration to final domain
  let origin = req.get('origin');

  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Expose-Headers", "AMP-Access-Control-Allow-Source-Origin");
  res.header("AMP-Access-Control-Allow-Source-Origin", origin);
}