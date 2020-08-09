/**
 * See backed model/helopers/label_renderers.js for mroe details
 */

module.exports = function () {
    var _ = require('lodash');

    var m = {
        "study": function (study) {
            return _.get(study, 'studyName', "Unknown Study");
        }
    };

    return m;
};