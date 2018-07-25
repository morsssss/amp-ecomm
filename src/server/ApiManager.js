class ApiManager {


    /* Bike Shop API */
    /*
    constructor() {

        this.apiUrlEndpoint = '/bike-shop-api/';

        this.apiUrlMap = new Map();
        this.apiUrlMap.set('high-all', 'high-low-all-products');
        this.apiUrlMap.set('low-all', 'low-high-all-products');
        this.apiUrlMap.set('high-accessories', 'high-low-accessories-products');
        this.apiUrlMap.set('low-accessories', 'low-high-accessories-products');
        this.apiUrlMap.set('high-bikes', 'high-low-bikes-products');
        this.apiUrlMap.set('low-bikes', 'low-high-bikes-products');
        this.apiUrlMap.set('high-components', 'high-low-components-products');
        this.apiUrlMap.set('low-components', 'low-high-components-products');
    }
    
    getCategoryUrl(categoryId, sort) {

        var apiUrlKey = sort + '-' + categoryId;
        return this.apiUrlEndpoint + this.apiUrlMap.get(apiUrlKey) + '.json';

    }
    */

    /* Campmor API */
    constructor() {

        this.apiUrlEndpoint = 'https://campmor.ampify.wompmobile.com/campmor';
        this.apiCategoriesEndpoint = this.apiUrlEndpoint + '/fetchCategories';
        this.apiProductEndpoint = this.apiUrlEndpoint + '/fetchProduct';

        this.apiUrlMap = new Map();

        //Men's Shirts: https://campmor.ampify.wompmobile.com/campmor/fetchCategories?categoryId=200368502&sortBy=priceLtoH
        this.apiUrlMap.set('men-shirts-high-low', 'categoryId=200368502&sortBy=priceHtoL');
        this.apiUrlMap.set('men-shirts-low-high', 'categoryId=200368502&sortBy=priceLtoH');

        //Men's Shorts: https://campmor.ampify.wompmobile.com/campmor/fetchCategories?categoryId=200368503&sortBy=priceLtoH
        this.apiUrlMap.set('men-shorts-high-low', 'categoryId=200368503&sortBy=priceHtoL');
        this.apiUrlMap.set('men-shorts-low-high', 'categoryId=200368503&sortBy=priceLtoH');


        //Men's Shorts: https://campmor.ampify.wompmobile.com/campmor/fetchCategories?categoryId=200368509&sortBy=priceLtoH
        this.apiUrlMap.set('women-shirts-high-low', 'categoryId=200368507&sortBy=priceHtoL');
        this.apiUrlMap.set('women-shirts-low-high', 'categoryId=200368507&sortBy=priceLtoH');

        //Men's Shorts: https://campmor.ampify.wompmobile.com/campmor/fetchCategories?categoryId=200368507&sortBy=priceLtoH
        this.apiUrlMap.set('women-shorts-high-low', 'categoryId=200368509&sortBy=priceHtoL');
        this.apiUrlMap.set('women-shorts-low-high', 'categoryId=200368509&sortBy=priceLtoH');

    }

    getCategoryUrl(categoryId, sort) {

        var apiUrlParams = categoryId + '-' + sort;
        return this.apiCategoriesEndpoint + '?' + this.apiUrlMap.get(apiUrlParams);

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