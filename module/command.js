// command.js
// incoming command parsing

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
            case 'add_post': {
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
                    });
                }
            }
            case 'save': {
                fs.writeFileSync(config.databasepath, JSON.stringify(db));
                var resp = {
                    "job_id": cmd.job_id,
                    "error": false,
                    "response": "Database saved."
                }
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
    } else { return "Error: Invalid URL/Tags structure" }
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