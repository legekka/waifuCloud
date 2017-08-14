// command.js
// incoming command parsing
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.json').toString());

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
                if (errormsg != 'no error') {
                    var resp = {
                        "job_id": cmd.job_id,
                        "error": true,
                        "response": errormsg
                    }
                    connection.sendUTF(JSON.stringify(resp));
                } else {
                    addPost(cmd.post, db, () => {
                        var resp = {
                            "job_id": cmd.job_id,
                            "error": false,
                            "response": "Successfully added."
                        }
                        connection.sendUTF(JSON.stringify(resp));
                    });
                }
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
            case 'searchfilepaths': {
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
        }
    }
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
        filepath: postreq.filepath != undefined ? postreq.filepath : ''
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