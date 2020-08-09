const _ = require('lodash')
    // , customUiData = require('./form_custom_ui.json')
    , elementActions = require('./elements_actions')
    , chai = require('chai')
    , expect = chai.expect
    , generator = require('./form_fields_values_generator')
    , parseDataToBrowserFormat = require('./parseDataToBrowserFormat')
    , browserExecutes = require('./../../helpers/browserExecutes')
    , modelWorker = require('./../../helpers/modelWorker');


const scrolledZoneSelector = 'md-dialog-content';

/**
 * Map with functions for different types.
 */
const generateDataByType = {
    "String": {
        "undefined": {
            "generateData": generator.valuesGenerator.generateString,
            "generateDisplayed": generator.displayedGenerator.defaultGenerateDisplayed,
            "setElementValue": elementActions.setSimpleInputValue,
            "getElementValue": elementActions.getSimpleInputValue,
            "getData": parseDataToBrowserFormat.getBrowserDataString
        },
        "string": {
            "generateData": generator.valuesGenerator.generateListValue,
            "generateDisplayed": generator.displayedGenerator.generateDisplayedIncludeConfig,
            "setElementValue": elementActions.setMultiselectActions,
            "getElementValue": elementActions.getMultiselectActions,
            "getData": parseDataToBrowserFormat.getBrowserDataList
        }
    },
    "Date": {
        "undefined": {
            "generateData": generator.valuesGenerator.generateDate,
            "generateDisplayed": generator.displayedGenerator.generateDisplayedIncludeConfig,
            "setElementValue": elementActions.setDateInput,
            "getElementValue": elementActions.getDateInput,
            "getData": parseDataToBrowserFormat.getBrowserDataDate
        }
    },
    "Number": {
        "undefined": {
            "generateData": generator.valuesGenerator.generateNumber,
            "generateDisplayed": generator.displayedGenerator.defaultGenerateDisplayed,
            "setElementValue": elementActions.setNumberInput,
            "getElementValue": elementActions.getNumberInput,
            "getData": parseDataToBrowserFormat.getBrowserDataNumber
        },
        "string": {
            "generateData": generator.valuesGenerator.generateNumber,
            "generateDisplayed": generator.displayedGenerator.defaultGenerateDisplayed,
            "setElementValue": elementActions.setNumberListInput,
            "getElementValue": elementActions.getNumberListInput,
            "getData": parseDataToBrowserFormat.getBrowserDataNumberList
        }
    },
    "Boolean": {
        "undefined": {
            "generateData": generator.valuesGenerator.generateBoolean,
            "generateDisplayed": generator.displayedGenerator.defaultGenerateDisplayed,
            "setElementValue": elementActions.setBooleanInput,
            "getElementValue": elementActions.getBooleanInput,
            "getData": parseDataToBrowserFormat.getBrowserDataBoolean
        },
    }
};

module.exports.generateDataByType = generateDataByType;



/**
 * Function generate object with information for correct fill fields in form
 * @param schema {object} - model with schema, expected field format (now it model.json v2):
 * @param schemaName {string} - name of schema
    "medicalCoverage": {
        "type": "String",     // available values: Date, Number, String
        "list": "tri_state",  // - not required
        "fullName": "Medical Coverage",
        "description": "if covered (Y/N)",
        "enum": {
            "Y": "Yes",
            "N": "No",
            "U": "Unknown"
        }
    },
 *
 * @return {object} - with information for fill form
 */
module.exports.generateNewFormData = (schema, schemaName) => {
    let formData={};
    _.each(schema, (fieldData, fieldName) => {
        if (!modelWorker.isFieldSubSchema(fieldData)) {
            formData[fieldName] = {
                type: fieldData.type,
                list: fieldData.list,
                required: fieldData.required,
                fullName: fieldData.fullName,
                displayed: generateDataByType[fieldData.type][typeof fieldData.list].generateDisplayed(fieldData, fieldName, schemaName),
                "enum": fieldData.enum,
                data: generateDataByType[fieldData.type][typeof fieldData.list].generateData(fieldData)
            };
        }
    });
    return formData;
};




/**
 * Function for fill and submit form.
 * @param dataForInsert {object} object with data for insert in form. For generate data use function generateNewFormData.
 * @param schemaFieldName
 */
module.exports.fillAndSubmitForm = (dataForInsert) => {

    let currentScrollTop = 0;
    const maxDivScroll = browserExecutes.getMaxScrollTop(scrolledZoneSelector);
    
    /////////////////////
    // Fill form
    /////////////////////
    _.each(dataForInsert, (insertInfo, insertFieldName) => {
        const callback = () => {
            return generateDataByType[insertInfo.type][typeof insertInfo.list].setElementValue(insertInfo, insertFieldName);
        };
        const findResult = browserExecutes.findElementInScrollableZoneAndCallCallback(scrolledZoneSelector, callback, currentScrollTop, maxDivScroll);
        if (findResult === false) {
            // TODO throw error?
            console.log('Cannot set field: ', insertFieldName, 'with data:', insertInfo)
        }
    });
    
    /////////////////////
    // Submit form
    /////////////////////
    if (browser.isEnabled('.add-button', 3000) === true) {
        console.log("add new item");
        browser.click('.add-button');
    } else {
        console.log("click on cancel");
        browser.click('.cancel-button');
    }
};




module.exports.checkFormValues = (dataForInsert) => {
    _.each(dataForInsert, (insertInfo, insertFieldName) => {
        const callback = () => {
            const value = generateDataByType[insertInfo.type][typeof insertInfo.list].getElementValue(insertInfo, insertFieldName);
            if (value === false) {
                return false
            }
            expect(value.toString()).to.equal(insertInfo.data.toString(), 'in field: ' + insertFieldName)
            return true;
        };
        const findResult = browserExecutes.findElementInScrollableZoneAndCallCallback(scrolledZoneSelector, callback);
        if (findResult === false) {
            console.log('Cannot set field: ', insertFieldName, 'with data:', insertInfo)
        }
    });
};