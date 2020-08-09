const _ = require('lodash')
    , logger = require('log4js').getLogger();

const presentedFields = ["_id", "productCode", "productType"];

module.exports = (model, objectWithProducts) => {
    console.log(objectWithProducts);
    let newProducts = [];
    _.each(objectWithProducts.products, function (product) {
        let newProduct = {};
        _.each(presentedFields, function (field) {
            if (product[field]) {
                newProduct[field] = product[field];
            } else {
                logger.warn('product ', product, " not contain field " + field);
            }
        });
        newProducts.push(newProduct);
    });
    objectWithProducts.products = newProducts;
    return objectWithProducts;
};

