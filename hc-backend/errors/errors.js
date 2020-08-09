const errors = require('restify-errors')
    , logger = require('log4js').getLogger();

const defaultErrorMessage = "Internal server error";


/**
 *  Return error class name or undeifiend if class not defined there.
 * @param errorClass {object} - insance of error
 * @returns {string} or {undefined}
 */
const getErrorClassName = (errorClass) => {
    if (errorClass instanceof errors.InternalServerError) {
        return "InternalServerError"
    }
    if (errorClass instanceof errors.BadRequestError) {
        return "BadRequestError"
    }
    if (errorClass instanceof errors.ForbiddenError) {
        return "ForbiddenError"
    }
    if (errorClass instanceof errors.NotFoundError) {
        return "NotFoundError"
    }
    return undefined;
};

const errorCodes = {
    "InternalServerError": 500,
    "BadRequestError": 400,
    "ForbiddenError": 403,
    "NotFoundError": 404
};

/**
 * Function for handles errors in controllers
 * @param errorInstance {object} - instance of error-restify classes
 * @returns {object} - object format:
 *  {code: NUMBER, error: {...}}
 */
module.exports.errorsHandling = (errorInstance) => {
    let errorClass = getErrorClassName(errorInstance);
    if (!errorCodes[errorClass]) {
        logger.error('Unhandled error type: ', errorInstance);
        return {code: 500, error: {code: 500, message: defaultErrorMessage}};
    } else {
        const code = errorCodes[errorClass];
        let message;
        try { // if we cant parse like json then it's string
            message = JSON.parse(errorInstance.message)
            console.log(message)
        }
        catch (error) {
            console.log('catch')
            message =  errorInstance.message;
        }
        return {code: code, error: {code: code, message: message}};
    }
};

/**
 * Function for generate new restify-error instance
 * @param errorName - name of restify error
 * @param message - message for insert in error
 * @returns {errors.InternalServerError} if errorName not correct, else return instance of restify-error
 */
const generateError = (errorName, message) => {
    if (!errors[errorName]) {
        logger.error('Not found error with name ', errorName, " generated InternalServerError");
        return new errors.InternalServerError();
    }
    if (errorName === "InternalServerError") {
        logger.error(message);
        return new errors[errorName]({message: defaultErrorMessage});
    }
    return new errors[errorName]({message: message});
};
module.exports.generateError = generateError;

/**
 * Function for handled errors in catch block
 * @param error {*} error from try block
 * @returns {*} if @param error is not instance of restify-error then generate new Internal error and return it, else return @param error
 */
module.exports.onCatchHandler = (error) => {
    let errorClassName = getErrorClassName(error);
    if (!errorClassName) {
        logger.error("Unhandled error: ", error);
        return generateError("InternalServerError", defaultErrorMessage);
    }
    return error;
};