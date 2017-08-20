// command.js
// incoming command parsing
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.json').toString());
var exec = require('child_process').exec;
var getSize = require('get-folder-size');

module.exports = {
    command: (connection, db, cmd) => {
        switch (cmd.name) {
            case 'data_count': {
                var resp = {
                    "job_id": cmd.job_id,
                    "error": false,
                    "response": db.length
                }
                connection.sendUTF(JSON.stringify(resp));
            }
                break;
            case 'add_post': {
                console.log(cmd.post);
                var errormsg = isValidPost(cmd.post, db);
                var resp;
                if (errormsg != 'no error') {
                    resp = {
                        "job_id": cmd.job_id,
                        "error": true,
                        "response": errormsg
                    }
                    connection.sendUTF(JSON.stringify(resp));
                } else {
                    addPost(cmd.post, db, () => {
                        resp = {
                            "job_id": cmd.job_id,
                            "error": false,
                            "response": "Successfully added."
                        }
                        connection.sendUTF(JSON.stringify(resp));
                    });
                }
                console.log(resp);
            }
                break;
            case 'save': {
                fs.writeFileSync(config.databasepath, JSON.stringify(db));
                var resp = {
                    "job_id": cmd.job_id,
                    "error": false,
                    "response": "Database saved."
                }
                connection.sendUTF(JSON.stringify(resp));
            }
                break;
            case 'search_filepath': {
                if (cmd.mode == 'all') {
                    var result = findAllMissingPath(db);
                    if (result == "no error") {
                        var resp = {
                            "job_id": cmd.job_id,
                            "error": false,
                            "response": "All filepaths have found."
                        }
                        connection.sendUTF(JSON.stringify(resp));
                    } else {
                        var resp = {
                            "job_id": cmd.job_id,
                            "error": true,
                            "response": result
                        }
                        connection.sendUTF(JSON.stringify(resp));
                    }
                } else if (cmd.mode == 'one_file') {
                    // később
                }

                break;
            }
            case 'search_tags': {
                if (cmd.mode == "random") {
                    var result = randomPost(cmd.tags, db);
                    var resp = {
                        "job_id": cmd.job_id,
                        "name": 'post',
                        "error": result == "no post",
                        "response": result
                    }
                    connection.sendUTF(JSON.stringify(resp));
                }
                break;
            }
            case 'stats': {
                dbStatus(db, (response) => {
                    var resp = {
                        'job_id': cmd.job_id,
                        'name': 'stats',
                        'response': response
                    }
                    connection.sendUTF(JSON.stringify(resp));
                });
                break;
            }
        }
    }
}

function ver(callback) {
    lastcomm = exec('git log -n 1');
    lastcomm.stdout.on('data', (data) => {
        var title = data.toString().split('\n')[4].trim();
        return callback(title);
    });
}

function dbStatus(db, callback) {
    var filepath_count = 0;
    getSize(config.imagepath, (err, size) => {
        if (err) { throw err; }
        var mb = size / 1024 / 1024;
        var mbtext = mb.toFixed(2);
        for (i in db) {
            if (db[i].filepath != '') {
                filepath_count++;
            }
        }
        ver((version) => {
            var stat = {
                'name': 'WaifuCloud',
                'version': version,
                'git': 'http://github.com/legekka/waifuCloud',
                'post_count': db.length,
                'filepath_count': filepath_count,
                'size': mbtext + ' MB',
                'dbsize': (fs.statSync(config.databasepath).size / 1024 / 1024).toFixed(2) + ' MB',
                'uptime': format(process.uptime())
            }
            return callback(stat);
        });
    });
}

function randomPost(tags, db) {
    var results = searchTags(tags, db);
    if (results.length > 0) {
        if (results.length > 1) {
            return results[Math.round(Math.random() * results.length) - 1];
        } else { return results[0]; }
    } else {
        return "no post";
    }
}

function searchTags(tags, db) {
    var results = [];
    console.log(tags);
    for (i in db) {
        if (db[i].filepath != '') {
            var j = 0;
            var count = 0;
            while (j < tags.length && count != tags.length) {
                var k = 0;
                while (k < db[i].tags.length && tags[j] !== db[i].tags[k]) {
                    k++;
                }
                if (k < db[i].tags.length) {
                    count++;
                    j++;
                } else {
                    j = tags.length;
                }
            }
            if (count == tags.length) {
                results.push(db[i]);
            }
        }
    }
    return results;
}

function isValidPost(postreq, db) {
    if (postreq.url != undefined && postreq.tags != undefined) {
        if (postreq.filename != undefined) {
            var i = 0;
            while (i < db.length && db[i].filename != postreq.filename) { i++ }
            if (i >= db.length) { return "no error" }
            else { return "Error: Filename already exists" }
        } else { return "Error: No filename" }
    } else { return "Error: Invalid url/tags structure" }
}

function addPost(postreq, db, callback) {
    var post = {
        id: db.length,
        url: postreq.url, 
        tags: postreq.tags,
        filename: postreq.filename,
        filepath: postreq.filepath != undefined ? postreq.filepath : '',
        fileurl: postreq.filepath != undefined ? postreq.filepath.replace("d:/waifucloud/images","http://boltzmann.cf/images") : ''
    }
    db.push(post);
    return callback();
}


var imagelist = [];

function buildImagePathDb() {
    if (imagelist.length == 0) {
        var imagefolderlist = fs.readdirSync(config.imagepath);
    }
    for (i in imagefolderlist) {
        var list = fs.readdirSync(config.imagepath + imagefolderlist[i]);
        for (j in list) {
            imagelist.push(config.imagepath + imagefolderlist[i] + '/' + list[j]);
        }
    }
    console.log(imagelist);
}

function findAllMissingPath(db) {
    var errorlist = [];
    buildImagePathDb();
    for (i in db) {
        if (db[i].filepath == "") {
            var filepath = fileLocation(db[i].filename);
            if (filepath == 'error') {
                errorlist.push({
                    "id": db[i].id,
                    "error": "Filepath not found for filename.",
                    "filename": db[i].filename
                });
            } else {
                db[i].filepath = filepath;
                db[i].fileurl = filepath.replace("d:/waifucloud/images","http://boltzmann.cf/images");
            }
        }
    }
    return errorlist.length != 0 ? errorlist : "no error";
}




function fileLocation(filename) {
    var i = 0;
    while (i < imagelist.length && imagelist[i].split('/')[imagelist[i].split('/').length - 1].indexOf(filename) < 0) { i++ }
    if (i < imagelist.length) { return imagelist[i]; }
    else { return "error"; }
}

function format(seconds) {
    function pad(s) {
        return (s < 10 ? '0' : '') + s;
    }
    var hours = Math.floor(seconds / (60 * 60));
    var minutes = Math.floor(seconds % (60 * 60) / 60);
    var seconds = Math.floor(seconds % 60);

    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}
