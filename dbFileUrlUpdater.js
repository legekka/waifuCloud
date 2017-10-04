var fs = require('fs');

var db = JSON.parse(fs.readFileSync('./db.json').toString());

for (i in db) {
    if (db[i].fileurl.indexOf('boltzmann.cf')) {
        db[i].fileurl = db[i].fileurl.replace('boltzmann.cf','boltzmann.cf:7007');
    }
}

fs.writeFileSync('./dbupdated.json',JSON.stringify(db));