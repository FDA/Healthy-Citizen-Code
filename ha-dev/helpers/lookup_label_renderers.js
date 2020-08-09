/**
 * LookupLabelRenderers
 *
 *
 * args.label
 * args.table
 * args._id
 */

module.exports = function() {
  const m = {
    drugNameAndNdc: function(args) {
      debugger; // this.row.name + ' (NDC11:'+this.row.packageNdc11+')'
      return [
        args.lookup.label,
        'From table:' + args.lookup.table,
        'ID:' + args.lookup._id
      ].join('</br>');
    },
    dataAttachment: function(args) {
      var dataAttachments = Object.entries(args.lookup.data)
        .map(function(item) {
          var key = item[0];
          var val = item[1];
          return key + ':' + val
        });

      var result = [
        args.lookup.label,
        'From table:' + args.lookup.table,
        'Data attachment:'
      ].concat(dataAttachments);
      return result.join('</br>');
    }
  };
  return m;
};
