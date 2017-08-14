// WaifuCloud project
// local image database on Boltzmann

var fs = require('fs');
var http = require('http');
var WebSocketServer = require('websocket').server;
var reqreload = require('./module/reqreload.js');

var config = JSON.parse(fs.readFileSync('./config.json').toString());

console.log('Loading database...');
var db = JSON.parse(fs.readFileSync(config.databasepath).toString());
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

wsServer.on('request', function (request) {
    var username = JSON.parse(request.origin).username;
    if (JSON.parse(request.origin).password != fs.readFileSync(config.password).toString().trim()) {
        var conn = request.accept('echo-protocol', request.origin);
        conn.sendUTF('Wrong password.');
        conn.close();
        return;
    }
    var connection = request.accept('echo-protocol', request.origin);
    connection.id = generateID();
    connection.username = username;
    connections.push(connection);

    console.log(`${require('./module/getTime.js')('full')} ${username} connected (ConnectionID: ${connection.id})`);
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log(`${require('./module/getTime.js')('full')} ${connection.username}[${connection.id})]: ` + message.utf8Data.toString());
            var cmd = JSON.parse(message.utf8Data.toString().trim());
            reqreload('./commands.js').command(connection, db, cmd);
        }
    });

    connection.on('close', function (reasonCode, description) {
        console.log(`${require('./module/getTime.js')('full')} ${connection.username} from ${connections.remoteAddress} disconnected.`);
        connections[connection.id] = 'disconnected';
    });

});

function generateID() {
    var i = 0;
    while (i < connections.length) { i++ };
    return i;
}