// WaifuCloud project
// local image database on Boltzmann

var fs = require('fs');
var http = require('http');
var WebSocketServer = require('websocket').server;
var reqreload = require('./module/reqreload.js');
var decache = require('decache');
var config = JSON.parse(fs.readFileSync('./config.json').toString());
var exec = require('child_process').exec;

reqreload('./memwatch.js').start();

console.log('Loading database...');
var db = JSON.parse(fs.readFileSync(config.databasepath).toString());
var autosave = setInterval(() => {
    console.log('Autosaving database...');
    save();
    console.log('Autosave complete!');
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
                reqreload('./commands.js').command(connection, db, cmd, () => {
                    decache('./module/command.js');
                });
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

function save() {
    fs.writeFileSync(config.databasepath, JSON.stringify(db));
    fs.writeFileSync('../db-backup/' + reqreload('./getTime.js')('stamp') + ".json", JSON.stringify(db));
}