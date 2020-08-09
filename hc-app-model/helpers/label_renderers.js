/**
 * See backed model/helopers/label_renderers.js for mroe details
 */

module.exports = function () {
    var _ = require('lodash');

    var m = {
        "encounter": function (encounter) {
            var date = moment(_.get(encounter, 'admissionDate'));
            date = date ? date.format('MM/DD/YYYY') : 'Unknwon date';

            return _.get(encounter, 'providerName', "Unknown Provider") + " " +
                _.get(encounter, 'encounterType', "Unknown Encounter Type") + "@" +
                _.get(encounter, 'facilityLocation', "Unknown Facility Location") + ", " +
                date;
        }
    };

    return m;
};