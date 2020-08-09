const _ = require('lodash');

const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};
// const isUpperCase = (str) => {
//     return str === str.toUpperCase();
// };
// const addSpacesToCamelcaseWords = (string) => {
//     let newStringArr = string.split(' ');
//
//     let newString = '';
//     _.each(newStringArr, (word, index) => {
//         if (isUpperCase((word))) {
//             newString += word.split('').join(' ')
//         } else {
//             newString += word;
//         }
//         newString += " "
//     });
//     return newString
// };
//
// console.log(addSpacesToCamelcaseWords('asdasads QSDQDQ = asdasd asdas Dsd sda 123'))
module.exports = {
    setSimpleInputValue: (insertInfo, insertFieldName) => {
        const selectorForInsert = '[name="'+ insertFieldName + '"]';
        if (!browser.isVisible(selectorForInsert)) {
            return false
        }
        browser.setValue(selectorForInsert, insertInfo.data);
        browser.click(selectorForInsert);
        return true;
    },
    getSimpleInputValue: (insertInfo, insertFieldName) => {
        const selectorForInsert = '[name="'+ insertFieldName + '"]';
        if (!browser.isVisible(selectorForInsert)) {
            return false
        }
        return browser.getValue(selectorForInsert, insertInfo.data);
    },
    
    setMultiselectActions: (insertInfo, insertFieldName) => {
        const multiselectSelector = '#'+ insertFieldName;
        
        // there some select have bugs with isVisible value, need scroll
        // TODO remove this extra scroll with hack
        const scrollScript = "document.getElementsByTagName('md-dialog-content')[0].scrollTop = document.getElementById('" + insertFieldName + "').parentNode.parentNode.offsetTop - document.getElementsByTagName('md-dialog-content')[0].offsetTop;";
        console.log('scroll')
        browser.execute(scrollScript);
        // browser.pause(1000)
        const optionSelector = '.ui-select-choices-row';
        console.log('isv')
        if (!browser.isVisibleWithinViewport(multiselectSelector)) {
            return false
        }
        console.log('wfv')
        browser.waitForVisible(multiselectSelector, 5000);
        browser.click(multiselectSelector);
    
        if (!browser.isVisibleWithinViewport(optionSelector)) {
            return false;
        }
        browser.waitForVisible(optionSelector, 5000);
        browser.click(optionSelector);
    
        return true;
    },
    getMultiselectActions: (insertInfo, insertFieldName) => {
        const multiselectSelector = '#'+ insertFieldName;
        const scrollScript = "document.getElementsByTagName('md-dialog-content')[0].scrollTop = document.getElementById('" + insertFieldName + "').parentNode.parentNode.offsetTop - document.getElementsByTagName('md-dialog-content')[0].offsetTop;";
    
        browser.execute(scrollScript);
        if (!browser.isVisibleWithinViewport(multiselectSelector)) {
            return false
        }
        const textFromMultiselect = browser.getText(multiselectSelector).trim();
        console.log(textFromMultiselect)
        
        let foundIndex = 0, i = 0;
        _.each(insertInfo.enum, (value) => {
            i++;
            let text = value;
            if (_.isObject(value)) { // string list  like route
                text = text.name;
            }
            text = capitalizeFirstLetter(text).trim();
            // text = addSpacesToCamelcaseWords(text);
            if (text === textFromMultiselect) {
                foundIndex = i;
                return foundIndex;
            }
            console.log(textFromMultiselect)
            console.log(text)
        });
        return foundIndex;
    },

    setNumberInput: (insertInfo, insertFieldName) => {
        const selectorForInsert = '[name="'+ insertFieldName + '"]';
        if (!browser.isVisible(selectorForInsert)) {
            return false
        }
        browser.click(selectorForInsert);
        browser.setValue(selectorForInsert, insertInfo.data);
        return true;
    },
    getNumberInput: (insertInfo, insertFieldName) => {
        const selectorForInsert = '[name="'+ insertFieldName + '"]';
        if (!browser.isVisible(selectorForInsert)) {
            return false
        }
        browser.click(selectorForInsert);
        return browser.getValue(selectorForInsert, insertInfo.data);
    },
    
    setNumberListInput: (insertInfo, insertFieldName) => {
        // const selectorForInsert = '[name="'+ insertFieldName + '"]';
        // if (!browser.isVisible(selectorForInsert)) {
        //     return false
        // }
        // browser.click(selectorForInsert);
        // browser.setValue(selectorForInsert, insertInfo.data);
        return true;
    },
    getNumberListInput: (insertInfo, insertFieldName) => {
        return 3
    },
    
    setDateInput: (insertInfo, insertFieldName) => {
        const selectorForInsert = '[placeholder="'+ insertInfo.displayed + '"]';
        if (!browser.isVisible(selectorForInsert)) {
            return false
        }
        browser.click(selectorForInsert);
        browser.setValue(selectorForInsert, insertInfo.data);
        return true;
    },
    getDateInput: (insertInfo, insertFieldName) => {
        const selectorForInsert = '[placeholder="'+ insertInfo.displayed + '"]';
        if (!browser.isVisible(selectorForInsert)) {
            return false
        }
        browser.click(selectorForInsert);
        return browser.getValue(selectorForInsert, insertInfo.data);
    },
    
    setBooleanInput: (insertInfo, insertFieldName) => {
        // console.log('click')
        // const selectorForInsert = '#"'+ insertFieldName;
        // if (!browser.isVisible(selectorForInsert)) {
        //     return false
        // }
        // if (insertInfo.data == true ) {
        //     browser.click(selectorForInsert);
        // }
        return true;
    },
    getBooleanInput: () => {
        return true
    }
};