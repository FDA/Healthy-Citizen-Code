module.exports = {
    getBrowserDataString: (fieldData) => {
        return fieldData.data;
    },
    getBrowserDataList: (fieldData) => {
        const keys = _.keys(fieldData.enum);
        return keys[0]; //todo fix later
    },
    getBrowserDataDate: (fieldData) => {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timezone: 'UTC',
        };
        const date = new Date(fieldData.data);
        return date.toLocaleString("en-US", options)
    },
    getBrowserDataNumber: (fieldData) => {
        return fieldData.data.toString();
    },
    getBrowserDataNumberList: (fieldData) => {
        console.log("CALL: ", this.getBrowserDataNumberList, ' fieldData: ', fieldData)
        return "-";
    },
    getBrowserDataBoolean: (fieldData) => {
        // return fieldData.data.toString();
        // TODO now boolean not realized, in browser true === succes icon, but false === '-'. in actions bool ignored
        return "-";
    }
}