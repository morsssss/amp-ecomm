const express = require('express');
const request = require('request');
const path = require('path');
const fs = require('fs');
const productApiManager = require('./ApiManager.js');
const mustache = require("mustache");
const formidableMiddleware = require('express-formidable');
const sessions = require("client-sessions");
const serializer = require('serialize-to-js');
const rand = require("random-key");

const app = express();

app.use(formidableMiddleware());
app.use(sessions({
    cookieName: 'session',
    secret: 'eommercedemoofamazigness',
    duration: 24 * 60 * 60 * 1000,
    activeDuration: 1000 * 60 * 5
}));

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
    // defaults to women shirts
    let resProductsGender = 'women';
    let resProductsCategory = 'shirts';
    let resShirtSelected = true;
    let resShortSelected = false;
    // read parameters
    let productsGender = req.query.gender || resProductsGender;
    let productsCategory = req.query.category || resProductsCategory;
    let listingUrl = apiManager.getCategoryUrl(productsGender+'-'+productsCategory);
    if (!listingUrl.match('categoryId=undefined')) {
        resProductsCategory = productsCategory;
        resProductsGender = productsGender;
        if (!resProductsGender.match('women')) {
            resProductsGender = 'men';
        }
        if (!resProductsCategory.match('shirt')) {
            resShirtSelected = false;
            resShortSelected = true;
        }
    } 
    mustache.tags = ['<%','%>'];
    let responseObj = {
        productsCategory: resProductsCategory,
        productsGender: resProductsGender
    };
    if (resShirtSelected) {
        responseObj.shirtSelected = true;
    }
    else if (resShortSelected) {
        responseObj.shortSelected = true;
    }
    res.render('product-listing', responseObj);
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

    let productId = req.fields.productId;
    let name = req.fields.name;
    let price = req.fields.price;
    let color = req.fields.color;
    let size = req.fields.size;
    let imgUrl = req.fields.imgUrl;
    let origin = req.get('origin');
    let quantity = req.fields.quantity;

    //If comes from the cache
    if (req.headers['amp-same-origin'] !== 'true') {
        //transfrom POST into GET and redirect to same url
        let queryString = 'productId=' + productId + '&name=' + name + '&price=' + price + '&color=' + color + '&size=' + size + '&quantity=' + quantity + '&origin=' + origin + '&imgUrl=' + imgUrl;
        res.header("Access-Control-Expose-Headers", "AMP-Access-Control-Allow-Source-Origin,AMP-Redirect-To");
        res.header("AMP-Access-Control-Allow-Source-Origin", origin);
        res.header("AMP-Redirect-To", origin + "/add_to_cart?" + queryString);
    } else {
        updateShoppingCartOnSession(req, productId, name, price, color, size, imgUrl, quantity);
        res.header("AMP-Redirect-To", origin + "/shopping_cart");
    }

    //set AMP headers to redirect to cart page
    res.header("Access-Control-Expose-Headers", "AMP-Access-Control-Allow-Source-Origin,AMP-Redirect-To");
    res.header("AMP-Access-Control-Allow-Source-Origin", origin);
    res.header("AMP-Redirect-To", origin + "/cart-details.html");

    //amp-form requires json response
    res.json({});
});

app.get('/api/add_to_cart', function(req, res) {
    let productId = req.query.productId;
    let name = req.query.name;
    let price = req.query.price;
    let color = req.query.color;
    let size = req.query.size;
    let imgUrl = req.query.imgUrl;
    let quantity = req.query.quantity;

    updateShoppingCartOnSession(req, productId, name, price, color, size, imgUrl, quantity);
    res.redirect('/shopping_cart');
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

    let shoppingCart = req.session.shoppingCart;

    //cookie exists, but cart is empty
    if (shoppingCart) {
        shoppingCart = serializer.deserialize(shoppingCart);
    } else {
        let cartId = rand.generate(7);
        shoppingCart = createCart(cartId);
        req.session.shoppingCart = serializer.serialize(shoppingCart);
    }

    //wrap the shopping cart into an 'items' array, so it can be consumed with amp-list.
    let shoppingCartResponse = {items : []};
    shoppingCartResponse.items.push(shoppingCart);

    res.send(shoppingCartResponse);
});

app.post('/api/delete-cart-item', function(req, res) {

    let productId = req.fields.productId;
    let color = req.fields.color;
    let size = req.fields.size;

    let shoppingCartResponse = {items : []};

    let shoppingCart = req.session.shoppingCart;

    if(shoppingCart) {
        shoppingCart = serializer.deserialize(shoppingCart);
        shoppingCart.removeItem(productId, color, size);
        req.session.shoppingCart = serializer.serialize(shoppingCart);
        shoppingCartResponse.items.push(shoppingCart);
    }

    enableCors(req, res);
    res.send(shoppingCartResponse);
});

function updateShoppingCartOnSession(req, productId, name, price, color, size, imgUrl, quantity) {
    let cartProduct = apiManager.createCartItem(productId, name, price, color, size, imgUrl, quantity);
    let shoppingCart = req.session.shoppingCart;

    if (shoppingCart) {
        shoppingCart = serializer.deserialize(shoppingCart);
    } else {
        let cartId = rand.generate(7);
        shoppingCart = apiManager.createCart(cartId);
    }

    shoppingCart.addItem(cartProduct);
    req.session.shoppingCart = serializer.serialize(shoppingCart);
}

function enableCors(req, res) {

  //set to all for dev purposes only, change it by configuration to final domain
  let origin = req.get('origin');

  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Expose-Headers", "AMP-Access-Control-Allow-Source-Origin");
  res.header("AMP-Access-Control-Allow-Source-Origin", origin);
}