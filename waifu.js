// WaifuCloud project
// local image database on Boltzmann

var fs = require('fs');
var http = require('http');
var WebSocketServer = require('websocket').server;
var reqreload = require('./module/reqreload.js');
var decache = require('decache');
var config = JSON.parse(fs.readFileSync('./config.json').toString());
var exec = require('child_process').exec;

var memwatch = {
    limit: 500,
    start: () => {
        setInterval(() => {
            var memrss = process.memoryUsage().rss;
            if (memrss / 1024 / 1024 > memwatch.limit) {
                console.log('Memory overload: ' + (memrss / 1024 / 1024).toFixed(2) + ' MB / ' + memwatch.limit.toFixed(2) + " MB");
                process.exit(2);
            }
            memrss = null;
        }, 1000);
    }
}
var autosave = {
    autosave: (db, config) => {
        let db2 = JSON.parse(fs.readFileSync(config.databasepath).toString());
        if (db != db2) {
            fs.writeFileSync(config.databasepath, JSON.stringify(db));
            fs.writeFileSync('../db-backup/' + reqreload('./getTime.js')('stamp') + ".json", JSON.stringify(db));
            console.log('Autosave complete!');
        } else {
            console.log('No changes detected. Skipping save...');
        }
    },
    save: (db, config) => {
        fs.writeFileSync(config.databasepath, JSON.stringify(db));
        fs.writeFileSync('../db-backup/' + reqreload('./getTime.js')('stamp') + ".json", JSON.stringify(db));
    }

}
var commands = {
    command: (connection, db, cmd) => {
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
                let errormsg = commands.isValidPost(cmd.post, db);
                let resp;
                if (errormsg != 'no error') {
                    resp = {
                        "job_id": cmd.job_id,
                        "error": true,
                        "response": errormsg
                    }
                    connection.sendUTF(JSON.stringify(resp));
                } else {
                    commands.addPost(cmd.post, db, () => {
                        resp = {
                            "job_id": cmd.job_id,
                            "error": false,
                            "response": "Successfully added."
                        }
                        connection.sendUTF(JSON.stringify(resp));
                    });
                }
                //console.log(resp);
                return
            }
                break;
            case 'del_post': {
                commands.delPost(cmd.id, db, (err, post) => {
                    let resp = {
                        "job_id": cmd.job_id,
                        "error": err != 'no error',
                        "response": err == 'no error' ? post : err
                    }
                    console.log(resp);
                    connection.sendUTF(JSON.stringify(resp));
                });
                return
            }
                break;
            case 'save': {
                autosave.save(db, config);
                let resp = {
                    "job_id": cmd.job_id,
                    "error": false,
                    "response": "Database saved."
                }
                connection.sendUTF(JSON.stringify(resp));
                return
            }
                break;
            case 'search_filepath': {
                if (cmd.mode == 'all') {
                    let result = commands.findAllMissingPath(db);
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
                return
            }
                break;
            case 'search_tags': {
                if (cmd.mode == "random") {
                    var result = commands.randomPost(cmd.tags, db);
                    let resp = {
                        "job_id": cmd.job_id,
                        "name": 'post',
                        "error": result == "no post",
                        "response": result
                    };
                    connection.sendUTF(JSON.stringify(resp));
                }
                return
            }
                break;
            case 'stats': {
                commands.dbStatus(db, (response) => {
                    let resp = {
                        'job_id': cmd.job_id,
                        'name': 'stats',
                        'response': response
                    }
                    connection.sendUTF(JSON.stringify(resp));
                });
                return
            }
                break;
        }
        return
    },



    ver: (callback) => {
        lastcomm = exec('git log -n 1');
        lastcomm.stdout.on('data', (data) => {
            let title = data.toString().split('\n')[4].trim();
            lastcomm.kill();
            return callback(title);
        });
    },

    getSize: (db) => {
        let size = 0;
        for (i in db) {
            if (db[i].size != '') {
                size += db[i].size;
            }
        }
        return size;
    },

    dbStatus: (db, callback) => {
        let filepath_count = 0;
        let size = commands.getSize(db);
        let gb = size / 1024 / 1024 / 1024;
        let gbtext = gb.toFixed(2);
        for (i in db) {
            if (db[i].filepath != '') {
                filepath_count++;
            }
        }
        commands.ver((version) => {
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
                'uptime': commands.format(process.uptime()),
                'usage': memrss
            }
            return callback(stat);
        });
    },

    randomPost: (tags, db) => {
        let results = commands.searchTags(tags, db);
        if (results.length > 0) {
            if (results.length > 1) {
                var rng = Math.min(Math.round(Math.random() * results.length), results.length - 1);
                return results[rng];
            } else { return results[0]; }
        } else {
            return "no post";
        }
    },

    searchTags: (tags, db) => {
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
    },
    isValidPost: (postreq, db) => {
        if (postreq.url != undefined && postreq.tags != undefined) {
            if (postreq.filename != undefined) {
                let i = 0;
                while (i < db.length && db[i].filename != postreq.filename) { i++ }
                if (i >= db.length) { return "no error" }
                else { return "Error: Filename already exists" }
            } else { return "Error: No filename" }
        } else { return "Error: Invalid url/tags structure" }
    },

    addPost: (postreq, db, callback) => {
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
        return
    },

    delPost: (id, db, callback) => {
        let i = 0;
        while (i < db.length && db[i].id != id) { i++; }
        if (i < db.length) {
            db.splice(i, 1);
            return callback('no error', db[i]);
        } else {
            return callback('ID not found.');
        }
    },



    buildImagePathDb: (callback) => {
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
    },

    findAllMissingPath: (db) => {
        let errorlist = [];
        commands.buildImagePathDb((imagelist) => {
            for (i in db) {
                if (db[i].filepath == "") {
                    let filepath = commands.fileLocation(db[i].filename, imagelist);
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
    },

    fileLocation: (filename, imagelist) => {
        let i = 0;
        while (i < imagelist.length && imagelist[i].split('/')[imagelist[i].split('/').length - 1].indexOf(filename) < 0) { i++ }
        if (i < imagelist.length) { return imagelist[i]; }
        else { return "error"; }
    },

    format: (seconds) => {
        let hours = Math.floor(seconds / (60 * 60));
        let minutes = Math.floor(seconds % (60 * 60) / 60);
        let secs = Math.floor(seconds % 60);

        return commands.pad(hours) + ':' + commands.pad(minutes) + ':' + commands.pad(secs);
    },
    pad: (s) => {
        return (s < 10 ? '0' : '') + s;
    }
}

memwatch.start();

console.log('Loading database...');
var db = JSON.parse(fs.readFileSync(config.databasepath).toString());
var autosave = setInterval(() => {
    console.log('Autosaving database...');
    autosave.autosave(db, config);
}, 3600000);

console.log('Loading complete!');


var server = http.createServer(function (request, response) {
    response.writeHead(404);
    response.end();
});
server.listen(config.port, function () {
    console.log('WS server is listening on port: ' + config.port);
});

wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

var connections = [];

wsServer.on('request', request => {
    var connection = request.accept("echo-protocol", request.origin);
    connection.auth = false;
    connection.id = generateID();

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            let cmd;
            try {
                cmd = JSON.parse(message.utf8Data.toString().trim());
            }
            catch (excpt) {
                connection.sendUTF("Wrong JSON.");
            }
            if (cmd.type == "auth") {
                if (cmd.password != fs.readFileSync(config.password).toString().trim()) {
                    connection.sendUTF('Wrong password.');
                    connection.close();
                    return;
                }
                connection.auth = true;
                connection.username = cmd.username;
                console.log(`${require('./module/getTime.js')('full')} ${cmd.username} connected (ConnectionID: ${connection.id})`);
                connections.push(connection);
                connection.sendUTF("JSON_Password_Accepted");
            }
            else if (connection.auth) {
                //console.log(`${require('./module/getTime.js')('full')} ${connection.username}[${connection.id})]: ` + message.utf8Data.toString());
                commands.command(connection, db, cmd);
            }
            else {
                connection.sendUTF("Request_JSON_Password");
            }
        }
    });

    connection.on('close', function (reasonCode, description) {
        if (connection.auth)
            console.log(`${require('./module/getTime.js')('full')} ${connection.username} from ${connections.remoteAddress} disconnected.`);
        connections[connection.id] = 'disconnected';
    });
    var object;
    try {
        object = JSON.parse(request.origin);
        if (object.password != fs.readFileSync(config.password).toString().trim()) {
            connection.sendUTF('Wrong password.');
            connection.close();
            return;
        }
        connection.auth = true;
        connection.username = object.username;
        console.log(`${require('./module/getTime.js')('full')} ${connection.username} connected (ConnectionID: ${connection.id})`);
        connections.push(connection);
    }
    catch (excpt) {
        connection.sendUTF("Request_JSON_Password");
    }
});

function generateID() {
    var i = 0;
    while (i < connections.length) { i++ };
    return i;
}

