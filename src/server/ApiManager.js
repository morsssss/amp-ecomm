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

            //Default size (color level).
            all_Colors_Array[i].DefaultSize = avaliable_Sizes_Array[0].SizeName;

            let lastAvailable;

            for(var j = 0; j < avaliable_Sizes_Array.length; j++) {
                if(avaliable_Sizes_Array[j].available) {

                    //Default size (product level): we take the first 'available' size of the first color, which is the one shown when page loads.
                    if(i == 0 && !productObj.DefaultSize) {
                        let defaultSize = avaliable_Sizes_Array[j];
                        
                        productObj.DefaultSize = defaultSize.SizeName;
                        productObj.DefaultPrice = defaultSize.Discount_Price;
                    }

                    //The last available size of each color.
                    lastAvailable = avaliable_Sizes_Array[j];
                }
            }

            lastAvailable.Last = true;
        }
    }
}

module.exports = ApiManager;