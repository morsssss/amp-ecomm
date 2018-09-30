class ApiManager {

    constructor() {

        this.apiUrlEndpoint = 'https://campmor.ampify.wompmobile.com/campmor';
        this.apiCategoriesEndpoint = this.apiUrlEndpoint + '/fetchCategories';
        this.apiProductEndpoint = this.apiUrlEndpoint + '/fetchProduct';


        var apiUrlValues = [
            ['men-shirts', '200368502'],
            ['men-shorts', '200368503'],
            ['women-shirts', '200368507'],
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

        //transform reviews into arrays of stars to be rendered on the template with mustache.
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
        
        return productObj;
    }

}

module.exports = ApiManager;