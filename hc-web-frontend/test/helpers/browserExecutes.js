const scrollStep = 100


const scrollInnerBlock = (scrolledSelector, scrollPos) => {
    const scrollScript = "document.getElementsByTagName('" + scrolledSelector + "')[0].scrollTop = " + scrollPos + ";";
    browser.execute(scrollScript);
};
module.exports.scrollInnerBlock = scrollInnerBlock;


/**
 * Get height of element for scroll
 * @return {int}
 */
const getMaxScrollTop = (scrollZoneSelector) => {
    const result = browser.execute(function (selector) {
        const trueDivHeight = $(selector)[0].scrollHeight;
        const divHeight = $(selector).height();
        return trueDivHeight - divHeight;
    }, scrollZoneSelector).value;
    return result;
};
module.exports.getMaxScrollTop = getMaxScrollTop;


/**
 * Function for find element (it must be in callback) in scrollable zone.
 * @param scrollSelector {string} - selector for find
 * @param callback {function} - will be call when selector found, expected function format:
 *      must return true if element visible, else must return false.
 * @param currentScrollTop {number} - current  scrollTop attribute value
 * @param maxDivScroll {number} - maximum of scrollTop for current element
 * @return {boolean} true if element found and callback called, else false.
 */
const findElementInScrollableZoneAndCallCallback = (scrollSelector, callback, currentScrollTop, maxDivScroll) => {
    scrollInnerBlock(scrollSelector, 0);
    let callbackResult = callback();
    
    // Find and value of selector in scrollable zone
    while(callbackResult === false && maxDivScroll > currentScrollTop) {
        currentScrollTop += scrollStep;
        scrollInnerBlock(scrollSelector, currentScrollTop);
        callbackResult = callback();
    }
    return callbackResult;
};
module.exports.findElementInScrollableZoneAndCallCallback = findElementInScrollableZoneAndCallCallback;