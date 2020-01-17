module.exports = function() {
    const m = {
        profileDevice: function(args) {
            var using = _.get(args,"fieldData."+args.index+".usingDevice");
            var selected = _.get(args,"fieldData."+args.index+".device.label")
            var notes = _.get(args,"fieldData."+args.index + ".deviceNotes");
            return selected ? selected + (using ? " (using) " : " (watching)") + ( notes ? ": " + notes : "") : "Not Selected";
        },
        profileDrug: function(args) {
            var using = _.get(args,"fieldData."+args.index+".takingDrug");
            var selected = _.get(args,"fieldData."+args.index+".drug.label");
            var notes = _.get(args,"fieldData."+args.index + ".drugNotes");
            return selected ? selected + (using ? " (taking) " : " (watching)") + ( notes ? ": " + notes : "") : "Not Selected";
        },
        profileDiagnosis: function(args) {
            var diagnosis = _.get(args,"fieldData."+args.index+".diagnosis");
            var selected = _.get(diagnosis, (diagnosis ? diagnosis.length-1 : 0) + ".label");
            var using = _.get(args,"fieldData."+args.index+".havingDiagnosis");
            var notes = _.get(args,"fieldData."+args.index + ".diagnosisNotes");
            return selected ? selected + (using ? " (having) " : " (watching)") + ( notes ? ": " + notes : "") : "Not Selected";
        }
    };
    return m;
};
