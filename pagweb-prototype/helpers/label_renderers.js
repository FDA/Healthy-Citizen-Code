/**
 * See backed model/helopers/label_renderers.js for mroe details
 */

module.exports = function () {
    var _ = require('lodash');

    var m = {
        "void": function (encounter) {
            return "void";
        }
    };

    return m;
};