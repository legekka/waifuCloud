// temporary program

var fs = require('fs');

var path = './db.json';

var db = JSON.parse(fs.readFileSync(path).toString().trim());

for (i in db) {
    if (db[i].fileurl.startsWith('D')) {
        db[i].filepath = db[i].filepath.toLowerCase();
        db[i].fileurl = db[i].filepath.replace("d:/waifucloud/images", "http://boltzmann.cf/images");
    }
}
fs.writeFileSync(path, JSON.stringify(db));