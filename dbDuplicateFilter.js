var fs = require('fs');

var db = JSON.parse(fs.readFileSync('./db.json').toString().trim());
var deadlist = [];

console.log(db.length);

var i = 0
while (i < db.length) {
    var j = i + 1;
    while (j < db.length && db[i].url != db[j].url) {
        j++;
    }
    if (j < db.length) {
        deadlist.push(db[i].id);
    }
    i++;
}
console.log("Duplicated posts: " + deadlist.length);

counter = 0;
while (deadlist.length != 0) {
    var i = 0
    while (i < db.length && deadlist[0] != db[i].id) {
        i++;
    }
    if (i >= db.length) {
        console.log("mi a fasz");
        process.exit();
    }
    counter++;
    db.splice(i,1);
    deadlist.splice(0,1);
}
console.log(counter);
console.log('Splice completed.')

var i = 0
while (i < db.length) {
    var j = i + 1;
    while (j < db.length && db[i].url != db[j].url) {
        j++;
    }
    if (j < db.length) {
        deadlist.push(db[i].id);
    }
    i++;
}
console.log("Duplicated posts: " + deadlist.length);
console.log(db.length);
fs.writeFileSync('./db.json',JSON.stringify(db));