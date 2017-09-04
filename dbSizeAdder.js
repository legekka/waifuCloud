var fs = require('fs');

var path = './db.json';
var db = JSON.parse(fs.readFileSync(path).toString().trim());

for (i in db) {
    if (db[i].filepath != '') {
        db[i].size = fs.statSync(db[i].filepath).size;
    } else {
        console.log(i + ' üres');
        process.exit();
        //írd meg, bár nem kell ahogy nézem.
    }
}

fs.writeFileSync(path, JSON.stringify(db));