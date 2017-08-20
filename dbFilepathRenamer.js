// temporary program

var fs = require('fs');

var path = './db.json';

var db = JSON.parse(fs.readFileSync(path).toString().trim());

for (i in db) {
    db[i].fileurl = "";
    if (db[i].filepath != "") {
        db[i].fileurl = db[i].filepath;
        db[i].filepath = db[i].filepath.replace("http://boltzmann.cf/images","d:/waifucloud/images");
    }
}
fs.writeFileSync(path,JSON.stringify(db));