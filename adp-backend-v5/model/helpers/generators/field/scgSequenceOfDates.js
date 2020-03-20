const _ = require('lodash');

// generates date and time stamps arranged in the specified order and puts them into specified fields
// Example
//     generator: "scgSequenceOfDates",
//     params: {
//       start: {
//         min: '1975-03-04T01:34:15',
//         max: '2073-01-06T02:13:49'
//       },
//       fields: [
// {field: "f1", min: 0, max:0},
// {field: "f2", min: 1440, max:2880},
// {field: "f3", min: 1440, max:2880}
//       ]
//     }
// This generates a date between start.min and start.max
// Then adds timespan between fields[i].min and fields[i].max and sets fields[i].field to that value
module.exports = ({ random }) => {
  return {
    scgSequenceOfDates() {
      const { start = {}, fields = [] } = this.params;
      const startMin = new Date(start.min) || new Date('1970-01-01T00:00:00Z');
      const startMax = new Date(start.max) || new Date();
      let current = random.date(startMin, startMax);

      _.forEach(fields, spec => {
        this.row[spec.field] = current;
        current = new Date(current.getTime() + random.integer(spec.min, spec.max) * 1000);
      });
    },
  };
};
