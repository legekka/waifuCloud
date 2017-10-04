// WaifuCloud project
// local image database on Boltzmann

var fs = require('fs');
var http = require('http');
var WebSocketServer = require('websocket').server;
var reqreload = require('./module/reqreload.js');
var decache = require('decache');
var config = JSON.parse(fs.readFileSync('./config.json').toString());
var exec = require('child_process').exec;
var md5 = require('md5');

var memwatch = {
    limit: 2048,
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
        console.log('Generating md5 sum...');
        let stringdb = JSON.stringify(db);
        let md5sum = md5(stringdb);
        console.log('Complete: ' + md5sum);
        if (md5sum != fs.readFileSync(config.md5path).toString().trim()) {
            console.log('md5 mismatch, saving changes...');
            fs.writeFileSync(config.md5path, md5sum);
            fs.writeFileSync(config.databasepath, stringdb);
            fs.writeFileSync('../db-backup/' + reqreload('./getTime.js')('stamp') + ".json", stringdb);
            console.log('Autosave complete!');
        } else {
            console.log('No changes since the last autosave.');
        }
        stringdb = undefined;
    },
    save: (db, config) => {
        console.log('Generating md5 sum...');
        let stringdb = JSON.stringify(db);
        let md5sum = md5(stringdb);
        console.log('Complete: ' + md5sum);
        fs.writeFileSync(config.md5path, md5sum);
        fs.writeFileSync(config.databasepath, stringdb);
        fs.writeFileSync('../db-backup/' + reqreload('./getTime.js')('stamp') + ".json", stringdb);
        stringdb = undefined;
    }

}
var commands = {
    command: (connection, db, cmd) => {
        console.log('[request] ' + connection.username);
        console.log(cmd);
        switch (cmd.name) {
            case 'data_count': {
                var resp = {
                    "job_id": cmd.job_id,
                    "error": false,
                    "response": db.length
                }
                connection.sendUTF(JSON.stringify(resp));
                return;
            }
                break;
            case 'add_post': {
                var errormsg = commands.isValidPost(cmd.post, db);
                var resp;
                if (errormsg != 'no error') {
                    resp = {
                        "job_id": cmd.job_id,
                        "error": true,
                        "response": errormsg
                    }
                    if (resp.error)
                        console.log(resp);
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
                    var resp = {
                        "job_id": cmd.job_id,
                        "error": err != 'no error',
                        "response": err == 'no error' ? post : err
                    }
                    if (resp.error)
                        console.log(resp);
                    connection.sendUTF(JSON.stringify(resp));
                });
                return
            }
                break;
            case 'save': {
                autosave.save(db, config);
                var resp = {
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
                    var result = commands.findAllMissingPath(db);
                    console.log(result);
                    if (result == "no error") {
                        var resp = {
                            "job_id": cmd.job_id,
                            "error": false,
                            "response": "All filepaths have found."
                        }
                        connection.sendUTF(JSON.stringify(resp));
                    } else {
                        /*var resp = {
                            "job_id": cmd.job_id,
                            "error": true,
                            "response": result
                        }
                        if (resp.error)
                            console.log(resp);
                        connection.sendUTF(JSON.stringify(resp));*/
                        for (i in result) {
                            var resp = result[i];
                            resp.job_id = cmd.job_id;
                            connection.sendUTF(JSON.stringify(resp));
                        }
                        console.log(`${result.length} filepath missing.`);
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
                    var resp = {
                        "job_id": cmd.job_id,
                        "name": 'post',
                        "error": result == "no post",
                        "response": result
                    };
                    if (resp.error)
                        console.log(resp);
                    connection.sendUTF(JSON.stringify(resp));
                }
                return
            }
                break;
            case 'search_id': {
                var result = commands.idPost(cmd.id, db);
                var resp = {
                    "job_id": cmd.job_id,
                    "name": 'post',
                    "error": result == "no post",
                    "response": result
                }
                if (resp.error)
                    console.log(resp);
                connection.sendUTF(JSON.stringify(resp));
            }
                break;
            case 'stats': {
                commands.dbStatus(db, (response) => {
                    var resp = {
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

    idPost: (id, db) => {
        if (db[id] != undefined) {
            return db[id];
        } else {
            return "no post";
        }
    },

    ver: (callback) => {
        lastcomm = exec('git log -n 1');
        lastcomm.stdout.on('data', (data) => {
            var title = data.toString().split('\n')[4].trim();
            lastcomm.kill();
            return callback(title);
        });
    },

    getSize: (db) => {
        var size = 0;
        for (i in db) {
            if (db[i].size != '') {
                size += db[i].size;
            }
        }
        return size;
    },

    dbStatus: (db, callback) => {
        var filepath_count = 0;
        var size = commands.getSize(db);
        var gb = size / 1024 / 1024 / 1024;
        var gbtext = gb.toFixed(2);
        for (i in db) {
            if (db[i].filepath != '') {
                filepath_count++;
            }
        }
        commands.ver((version) => {
            var memrss = process.memoryUsage().rss;
            memrss = (memrss / 1024 / 1024).toFixed(2);
            var stat = {
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
        var results = commands.searchTags(tags, db);
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
        var results = [];
        for (i in db) {
            if (db[i].filepath != '') {
                var j = 0;
                var count = 0;
                while (j < tags.length && count != tags.length) {
                    var k = 0;
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
                var i = 0;
                while (i < db.length && db[i].filename != postreq.filename) { i++ }
                if (i >= db.length) { return "no error" }
                else { return "Error: Filename already exists" }
            } else { return "Error: No filename" }
        } else { return "Error: Invalid url/tags structure" }
    },

    addPost: (postreq, db, callback) => {
        var path = postreq.filepath.toLowerCase();
        if (path) {
            path = path.toLowerCase();
            while (path.indexOf('\\') >= 0)
                path = path.replace("\\", "/");
        }
        var post = {
            id: db[db.length - 1].id + 1,
            url: postreq.url,
            tags: postreq.tags,
            filename: postreq.filename,
            filepath: path != undefined ? path : '',
            fileurl: path != undefined ? path.replace("d:/waifucloud/images", "http://boltzmann.cf:7007/images") : '',
            size: path != undefined ? fs.statSync(path).size : ''
        }
        db.push(post);
        post = undefined;
        return
    },

    delPost: (id, db, callback) => {
        var i = 0;
        while (i < db.length && db[i].id != id) { i++; }
        if (i < db.length) {
            db.splice(i, 1);
            return callback('no error', db[i]);
        } else {
            return callback('ID not found.');
        }
    },



    buildImagePathDb: () => {
        var imagelist = [];
        var imagefolderlist;
        if (imagelist.length == 0) {
            imagefolderlist = fs.readdirSync(config.imagepath);
        }
        if (imagefolderlist.indexOf('web.config')) {
            imagefolderlist.splice(imagefolderlist.indexOf('web.config'));
        }

        for (i in imagefolderlist) {
            var list = fs.readdirSync(config.imagepath + imagefolderlist[i]);
            for (j in list) {
                imagelist.push(config.imagepath + imagefolderlist[i] + '/' + list[j]);
            }
            list = undefined;
        }
        imagefolderlist = undefined;

        return imagelist;
    },

    findAllMissingPath: (db) => {
        var errorlist = [];
        var imagelist = commands.buildImagePathDb();
        for (i in db) {
            //          if (db[i].filepath == "") {
            var filepath = commands.fileLocation(db[i].filename, imagelist);
            if (filepath == 'error') {
                errorlist.push({
                    "id": db[i].id,
                    "error": true,
                    "result": "Filepath not found for filename.",
                    "filename": db[i].filename
                });
            } else {
                db[i].filepath = filepath;
                db[i].fileurl = filepath.replace("d:/waifucloud/images", "http://boltzmann.cf/images");
                //db[i].size = fs.statSync(filepath).size;
            }
            //          }
        }
        return errorlist.length != 0 ? errorlist : "no error";

    },

    fileLocation: (filename, imagelist) => {
        var i = 0;
        while (i < imagelist.length && imagelist[i].split('/')[imagelist[i].split('/').length - 1].indexOf(filename) < 0) { i++ }
        if (i < imagelist.length) { return imagelist[i]; }
        else { return "error"; }
    },

    format: (seconds) => {
        var hours = Math.floor(seconds / (60 * 60));
        var minutes = Math.floor(seconds % (60 * 60) / 60);
        var secs = Math.floor(seconds % 60);

        return commands.pad(hours) + ':' + commands.pad(minutes) + ':' + commands.pad(secs);
    },
    pad: (s) => {
        return (s < 10 ? '0' : '') + s;
    }
}

memwatch.start();

console.log('Loading database...');
var db = JSON.parse(fs.readFileSync(config.databasepath).toString());
var auto = setInterval(() => {
    console.log('Autosaving database...');
    autosave.autosave(db, config);
}, 3600000);

console.log('Loading compvare!');


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
            var cmd;
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

