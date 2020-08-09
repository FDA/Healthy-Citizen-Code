const customUiData = require('./form_custom_ui.json');


///////////////////////////////////////////////////
// Functions for generate data for fields in form
///////////////////////////////////////////////////
module.exports.valuesGenerator = {
    generateString: (fieldData) => {
        return "new";
    },
    generateListValue: (fieldData) => {
        return 1;
    },
    generateDate: (fieldData) => {
        return "12/05/1993"
    },
    generateNumber: (fieldData) => {
        return 3
    },
    generateBoolean: (fieldData) => {
        return true
    }
};

// TODO later, when model will be contain displayed field, it must be refactored
///////////////////////////////////////////////////
// Functions for generate displayed on fields in form
///////////////////////////////////////////////////

module.exports.displayedGenerator = {
    defaultGenerateDisplayed: (fieldData) => {
        if (fieldData.displayed)
            return fieldData.displayed;
        if (fieldData.fullName)
            return fieldData.fullName;
        return "Field"
    },
    generateDisplayedIncludeConfig: (fieldData, fieldName, schemaName) => {
        console.log(schemaName, fieldName);
        const customPlaceHolder = customUiData.placeholder[schemaName][fieldName];
        const placeholdersMap = {
            "undefined": fieldData.fullName,
            "string": customPlaceHolder
        };
        return placeholdersMap[typeof customPlaceHolder];
    }
}