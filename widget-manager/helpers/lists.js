// Data Types
// TODO: instead of enum use list in the schema definition, process definition before feeding to mongoose
// Alerts/enforcements reference: https://open.fda.gov/drug/enforcement/reference/
// Adverse events: https://open.fda.gov/device/event/reference/


module.exports = function () {
    var _ = require('lodash');

    var m = {
        genders: {
            'M': 'Male',
            'F': 'Female',
            'T': 'Trans-gender',
            'N': 'Prefer not to Answer'
        },
        ages: {
          "0-11": "Under 12 years old",
          "12-17": "12-17 years old",
          "18-24": "18-24 years old",
          "25-34": "25-34 years old",
          "35-44": "35-44 years old",
          "45-54": "45-54 years old",
          "55-64": "55-64 years old",
          "65-74": "65-74 years old",
          "75-": "75 years or older"
        },
        geographicRegions: {
            'NE': 'Northeast',
            'SE': 'Southeast',
            'SW': 'Southwest',
            'MW': 'Midwest',
            'NW': 'Northwest'
        }
    };

    return m;
};
