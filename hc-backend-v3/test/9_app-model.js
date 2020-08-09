const glob = require("glob");
const fs = require('fs');

const files = glob.sync(`${process.env.APP_MODEL_DIR}/test/**/*.js`);

console.log( `Running model-specific tests in ${process.env.APP_MODEL_DIR}` );
files.forEach((file)=>{eval(fs.readFileSync(file, 'utf8'))});
