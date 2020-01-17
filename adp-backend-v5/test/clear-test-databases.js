const { execSync } = require('child_process');
require('dotenv').load({ path: './test/backend/.env.test' });

const removeTestDbsCommand = `
var dbs = db.getMongo().getDBNames().filter(name => name.match(/^~[a-z0-9]{8}\\-[a-z0-9]{4}\\-[a-z0-9]{4}\\-[a-z0-9]{4}-[a-z0-9]{12}$/));
for(var i in dbs) {
  var db = db.getMongo().getDB(dbs[i]);
  print("dropping db " + db.getName());
  db.dropDatabase();
}`;

execSync(`mongo ${process.env.MONGODB_URI} --eval '${removeTestDbsCommand}'`);
