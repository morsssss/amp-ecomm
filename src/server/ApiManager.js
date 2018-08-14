class ApiManager {

    constructor() {

        this.apiUrlEndpoint = 'https://campmor.ampify.wompmobile.com/campmor';
        this.apiCategoriesEndpoint = this.apiUrlEndpoint + '/fetchCategories';
        this.apiProductEndpoint = this.apiUrlEndpoint + '/fetchProduct';

        this.apiUrlMap = new Map();

        this.apiUrlMap.set('men-shirts', '200368502');
        this.apiUrlMap.set('men-shorts', '200368503');
        this.apiUrlMap.set('women-shirts', '200368507');
        this.apiUrlMap.set('women-shorts', '200368509');

        this.apiUrlMap.set('high-low', 'priceHtoL');
        this.apiUrlMap.set('low-high', 'priceLtoH');

    }

    //Example url: https://campmor.ampify.wompmobile.com/campmor/fetchCategories?categoryId=200368507&sortBy=priceLtoH
    getCategoryUrl(categoryId, sort) {

        var apiUrlParams = 'categoryId='  + this.apiUrlMap.get(categoryId) + '&sortBy=' + this.apiUrlMap.get(sort);
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

}

module.exports = ApiManager;