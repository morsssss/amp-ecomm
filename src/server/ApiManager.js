class ApiManager {

    constructor() {

        this.apiUrlEndpoint = 'https://campmor.ampify.wompmobile.com/campmor';
        this.apiCategoriesEndpoint = this.apiUrlEndpoint + '/fetchCategories';
        this.apiProductEndpoint = this.apiUrlEndpoint + '/fetchProduct';


        var apiUrlValues = [
            ['men-shirts', '200368502'],
            ['men-shorts', '200368503'],
            ['women-shirts', '200368507'],
            ['women-shorts', '200368509'],
            ['high-low', 'priceHtoL'],
            ['low-high', 'priceLtoH']
        ];
        this.apiUrlMap = new Map(apiUrlValues);

    }

    //Example url: https://campmor.ampify.wompmobile.com/campmor/fetchCategories?categoryId=200368507&sortBy=priceLtoH
    getCategoryUrl(categoryId, sort) {

        var apiUrlParams = 'categoryId=' + this.apiUrlMap.get(categoryId) + '&sortBy=' + this.apiUrlMap.get(sort);
        return this.apiCategoriesEndpoint + '?' + apiUrlParams;

    }

    parseCategory(apiCategoryResponse) {

        let prodCategory = JSON.parse(apiCategoryResponse);
        let prodListing = prodCategory.matchingProducts;

        var parsedCategory = {
            items: []
        };

        for (var prod of prodListing) {
            let originalProd = prod.Value;
            let parsedProd = new Object();
            parsedProd.productId = originalProd.Main_Id;
            parsedProd.name = originalProd.Product_Title;
            parsedProd.description = originalProd.Product_Title; /* Missing field on Campmor API */
            parsedProd.price = originalProd.Price;
            parsedProd.image = originalProd.Photo;
            parsedProd.category = originalProd.Main_Id; /* Missing field on Campmor API */

            parsedCategory.items.push(parsedProd);
        }

        return parsedCategory;
    }

    //Example url: https://campmoramp.ampify.wompmobile.com/campmor/fetchProduct/31893
    getProductUrl(productId) {
        return this.apiProductEndpoint + '/' + productId;
    }

    parseProduct(apiProductResponse) {

        var productObj = JSON.parse(apiProductResponse);

        this.enhanceProductRatings(productObj);
        this.enhanceProductColors(productObj);
        this.enhanceProductSizes(productObj);

        return productObj;
    }

    /* Transforms product ratings into an array of stars to be rendered on the template with mustache.*/
    enhanceProductRatings(productObj) {
        var roundedRating = parseInt(productObj.RoundedRating);
        var reviewFullStars = new Array();
        var reviewEmptyStars = new Array();
        for (var i = 0; i < 5; i++) {
            if (i < roundedRating) {
                reviewFullStars.push(1);
            } else {
                reviewEmptyStars.push(1);
            }
        }
        productObj.ReviewFullStars = reviewFullStars;
        productObj.ReviewEmptyStars = reviewEmptyStars;
        productObj.ReviewCount = productObj.ReviewCount || 0;
    }

    enhanceProductColors(productObj) {
        productObj.DefaultColor = productObj.All_Colors[0].ColorName;
        productObj.All_Colors[0].defaultColour = true;
    }

    enhanceProductSizes(productObj) {
        var all_Colors_Array = productObj.All_Colors;

        for(var i = 0; i < all_Colors_Array.length; i++){
            let avaliable_Sizes_Array = all_Colors_Array[i].Avaliable_Sizes;

            let lastAvailable;

            for(var j = 0; j < avaliable_Sizes_Array.length; j++) {
                if(avaliable_Sizes_Array[j].available) {

                    //Default size (color level): The first available size for a given color.
                    if(!all_Colors_Array[i].DefaultSize) {
                        all_Colors_Array[i].DefaultSize = avaliable_Sizes_Array[j].SizeName;
                    }

                    //Default size (product level): The first 'available' size of the first color.
                    if(i == 0 && !productObj.DefaultSize) {
                        let defaultSize = avaliable_Sizes_Array[j];
                        
                        productObj.DefaultSize = defaultSize.SizeName;
                        productObj.DefaultPrice = defaultSize.Discount_Price;

                        avaliable_Sizes_Array[j].default = true;
                    }

                    //The last available size of each color (used to avoid adding a comma when rendering amp-state).
                    lastAvailable = avaliable_Sizes_Array[j];
                }
            }

            lastAvailable.Last = true;
        }
    }

    createCartItem(productId, name, price, color, size, imgUrl, quantity) {
        let cartProduct = new Object();
        cartProduct.productId = productId;
        cartProduct.name = name;
        cartProduct.price = parseInt(price);
        cartProduct.color = color;
        cartProduct.size = size;
        cartProduct.imgUrl = imgUrl;
        cartProduct.quantity = quantity;

        //replace
        cartProduct.quantity = 1;

        return cartProduct;
    }

    createCart(clientId) {

        let shoppingCart = {
            clientId: clientId,
            cartItems: [],
            subtotal: 0,
            shipping: 30,
            total: 0,
            isEmpty: true,
            addItem : function(item) {

                //check if item exists in cart before pushing
                var foundItem = this.cartItems.filter(function(elem){
                    return(elem.productId == item.productId && elem.color == item.color && elem.size == item.size);
                });

                if(foundItem.length > 0) {
                    foundItem[0].quantity += 1;
                } else {
                    this.cartItems.push(item);    
                }
                
                this.subtotal = this.subtotal + item.price;
                this.total = this.subtotal + this.shipping;
                this.isEmpty = false;
            }
        };

        return shoppingCart;
    }
}

module.exports = ApiManager;