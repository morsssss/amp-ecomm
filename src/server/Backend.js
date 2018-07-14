class Backend {

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

    getProductUrl(productId) {

    }

}

module.exports = Backend;