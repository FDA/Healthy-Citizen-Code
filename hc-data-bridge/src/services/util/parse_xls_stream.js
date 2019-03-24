const fs = require('fs'),
  flow = require('xml-flow'),
  inFile = fs.createReadStream('/home/andy/Downloads/faers_xml_2018q4/xml/1_ADR18Q4.xml'),
  xmlStream = flow(inFile);

xmlStream.on('tag:safetyreport', function(safetyreport) {
  // console.log(safetyreport);
});

xmlStream.on('end', function() {
  console.log('finished');
});
