// commands.js
// incoming command parsing
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.json').toString());
var exec = require('child_process').exec;

module.exports = {
    command: (connection, db, cmd, callback) => {
        switch (cmd.name) {
            case 'data_count': {
                let resp = {
                    "job_id": cmd.job_id,
                    "error": false,
                    "response": db.length
                }
                connection.sendUTF(JSON.stringify(resp));
                return;
            }
                break;
            case 'add_post': {
                let errormsg = isValidPost(cmd.post, db);
                let resp;
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
                //console.log(resp);
                return callback();
            }
                break;
            case 'del_post': {
                delPost(cmd.id, db, (err, post) => {
                    let resp = {
                        "job_id": cmd.job_id,
                        "error": err == 'no error',
                        "response": err == 'no error' ? post : err
                    }
                    connection.sendUTF(JSON.stringify(resp));
                });
                return callback();
            }
                break;
            case 'save': {
                let dbJSON = JSON.stringify(db);
                fs.writeFileSync(config.databasepath, dbJSON);
                fs.writeFileSync('../db-backup/' + require('./getTime.js')('stamp') + ".json", dbJSON);
                dbJSON = undefined;
                let resp = {
                    "job_id": cmd.job_id,
                    "error": false,
                    "response": "Database saved."
                }
                connection.sendUTF(JSON.stringify(resp));
                return callback();
            }
                break;
            case 'search_filepath': {
                if (cmd.mode == 'all') {
                    let result = findAllMissingPath(db);
                    if (result == "no error") {
                        let resp = {
                            "job_id": cmd.job_id,
                            "error": false,
                            "response": "All filepaths have found."
                        }
                        connection.sendUTF(JSON.stringify(resp));
                    } else {
                        let resp = {
                            "job_id": cmd.job_id,
                            "error": true,
                            "response": result
                        }
                        connection.sendUTF(JSON.stringify(resp));
                    }
                } else if (cmd.mode == 'one_file') {
                    // később
                }
                return callback();
            }
                break;
            case 'search_tags': {
                if (cmd.mode == "random") {
                    var result = randomPost(cmd.tags, db);
                    let resp = {
                        "job_id": cmd.job_id,
                        "name": 'post',
                        "error": result == "no post",
                        "response": result
                    };
                    connection.sendUTF(JSON.stringify(resp));
                }
                return callback();
            }
                break;
            case 'stats': {
                dbStatus(db, (response) => {
                    let resp = {
                        'job_id': cmd.job_id,
                        'name': 'stats',
                        'response': response
                    }
                    connection.sendUTF(JSON.stringify(resp));
                });
                return callback();
            }
                break;
        }
        return callback();
    }

}

function ver(callback) {
    lastcomm = exec('git log -n 1');
    lastcomm.stdout.on('data', (data) => {
        let title = data.toString().split('\n')[4].trim();
        lastcomm.kill();
        return callback(title);
    });
}

function getSize(db) {
    let size = 0;
    for (i in db) {
        if (db[i].size != '') {
            size += db[i].size;
        }
    }
    return size;
}

function dbStatus(db, callback) {
    let filepath_count = 0;
    let size = getSize(db);
    let gb = size / 1024 / 1024 / 1024;
    let gbtext = gb.toFixed(2);
    for (i in db) {
        if (db[i].filepath != '') {
            filepath_count++;
        }
    }
    ver((version) => {
        let memrss = process.memoryUsage().rss;
        memrss = (memrss / 1024 / 1024).toFixed(2);
        let stat = {
            'name': 'WaifuCloud',
            'version': version,
            'git': 'http://github.com/legekka/waifuCloud',
            'post_count': db.length,
            'filepath_count': filepath_count,
            'size': gbtext + ' GB',
            'dbsize': (fs.statSync(config.databasepath).size / 1024 / 1024).toFixed(2) + ' MB',
            'uptime': format(process.uptime()),
            'usage': memrss
        }
        return callback(stat);
    });
}

function randomPost(tags, db) {
    let results = searchTags(tags, db);
    if (results.length > 0) {
        if (results.length > 1) {
            var rng = Math.min(Math.round(Math.random() * results.length), results.length - 1);
            return results[rng];
        } else { return results[0]; }
    } else {
        return "no post";
    }
}

function searchTags(tags, db) {
    let results = [];
    console.log(tags);
    for (i in db) {
        if (db[i].filepath != '') {
            let j = 0;
            let count = 0;
            while (j < tags.length && count != tags.length) {
                let k = 0;
                while (k < db[i].tags.length && tags[j].toLowerCase() !== db[i].tags[k].toLowerCase()) {
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
            let i = 0;
            while (i < db.length && db[i].filename != postreq.filename) { i++ }
            if (i >= db.length) { return "no error" }
            else { return "Error: Filename already exists" }
        } else { return "Error: No filename" }
    } else { return "Error: Invalid url/tags structure" }
}

function addPost(postreq, db, callback) {
    var path = postreq.filepath;
    if (path) {
        path = path.toLowerCase();
        while (path.indexOf('\\') >= 0)
            path = path.replace("\\", "/");
    }
    let post = {
        id: db.length,
        url: postreq.url,
        tags: postreq.tags,
        filename: postreq.filename,
        filepath: path != undefined ? path : '',
        fileurl: path != undefined ? path.replace("d:/waifucloud/images", "http://boltzmann.cf/images") : '',
        size: path != undefined ? fs.statSync(path).size : ''
    }
    db.push(post);
    post = undefined;
    return callback();
}

function delPost(id, db, callback) {
    let i = 0;
    while (i < db.length && db[i].id != id) { i++; }
    if (i < db.length) {
        db.splice(i, 1);
        return callback('no error', db[i]);
    } else {
        return callback('ID not found.');
    }
}



function buildImagePathDb(callback) {
    let imagelist = [];
    let imagefolderlist;
    if (imagelist.length == 0) {
        imagefolderlist = fs.readdirSync(config.imagepath);
    }
    for (i in imagefolderlist) {
        let list = fs.readdirSync(config.imagepath + imagefolderlist[i]);
        for (j in list) {
            imagelist.push(config.imagepath + imagefolderlist[i] + '/' + list[j]);
        }
        list = undefined;
    }
    imagefolderlist = undefined;

    return callback(imagelist);
}

function findAllMissingPath(db) {
    let errorlist = [];
    buildImagePathDb((imagelist) => {
        for (i in db) {
            if (db[i].filepath == "") {
                let filepath = fileLocation(db[i].filename, imagelist);
                if (filepath == 'error') {
                    errorlist.push({
                        "id": db[i].id,
                        "error": "Filepath not found for filename.",
                        "filename": db[i].filename
                    });
                } else {
                    db[i].filepath = filepath;
                    db[i].fileurl = filepath.replace("d:/waifucloud/images", "http://boltzmann.cf/images");
                    db[i].size = fs.statSync(filepath).size;
                }
                filepath = undefined;
            }
        }
        return errorlist.length != 0 ? errorlist : "no error";
    });
}




function fileLocation(filename, imagelist) {
    let i = 0;
    while (i < imagelist.length && imagelist[i].split('/')[imagelist[i].split('/').length - 1].indexOf(filename) < 0) { i++ }
    if (i < imagelist.length) { return imagelist[i]; }
    else { return "error"; }
}

function format(seconds) {
    let hours = Math.floor(seconds / (60 * 60));
    let minutes = Math.floor(seconds % (60 * 60) / 60);
    let secs = Math.floor(seconds % 60);

    return pad(hours) + ':' + pad(minutes) + ':' + pad(secs);
}
function pad(s) {
    return (s < 10 ? '0' : '') + s;
}
