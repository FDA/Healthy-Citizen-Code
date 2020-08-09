var fs = require('fs');

// helpers
function iterate(obj, stack) {
    for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (Array.isArray(obj[property]) || typeof obj[property] == "object" && !(obj[property].hasOwnProperty("type"))) {
                iterate(obj[property], stack + ( property == 0 ? '[]' : '.' + property ));
            } else {
                var row = [stack + '.' + property];
                for (var attr in definition.schema) {
                    if (definition.schema.hasOwnProperty(attr)) {
                        var value = obj[property].hasOwnProperty( attr ) ? obj[property][attr] : definition.schema[attr].default;
                        //console.log(JSON.stringify(value));
                        row.push( typeof value == "undefined" ? "" : value );
                    }
                }
                console.log('"' + row.join('","') + '"');
                //console.log(stack + '.' + property, obj[property]);
            }
        }
    }
}

// read the model file
var lists = require('../src/data_model/lists.js');
var definition;
fs.readFile('../src/data_model/model-v2.json', 'utf8', function (err, data) {
    if (err) throw err;
    definition = JSON.parse(data);
    //console.log(JSON.stringify(definition.models.phi, null, 4));
    var header = ["attribute"];
    for (var property in definition.schema) {
        if (definition.schema.hasOwnProperty(property)) {
            header.push(definition.schema[property].fullName);
        }
    }
    console.log('"' + header.join('","') + '"');
    iterate(definition.models.phi, 'phi');
    iterate(definition.models.pii, 'pii');
});

