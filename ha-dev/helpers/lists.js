module.exports = () => {
    const m = {
        ageRanges: {
            '1': '0-5',
            '2': '6-10',
            '3': '11-20',
            '4': '21-30',
            '5': '31-40',
            '6': '41-50',
            '7': '51-60',
            '8': '61-70',
            '9': '71-80',
            '10': '81-90',
            '11': '91-100',
            '12': '>100'
        },
        genders: {
            'M': 'Male',
            'F': 'Female',
            'T': 'Trans-gender',
            'N': 'Prefer not to Answer'
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
