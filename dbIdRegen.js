// generate ids

var fs = require('fs');

var path = './db.json';

var db = JSON.parse(fs.readFileSync(path).toString());

for (i = 0; i < db.length-1; i++) {
    db[i].id = i;
}

fs.writeFileSync('./dbregenerated.json',JSON.stringify(db));