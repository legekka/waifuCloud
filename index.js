// WaifuCloud project
// local image database on Boltzmann

var fs = require('fs');
var http = require('http');
var WebSocketServer = require('websocket').server;

var config = JSON.parse(fs.readFileSync('./config.json').toString());




var server = http.createServer(function (request, response) {
    response.writeHead(404);
    response.end();
});
server.listen(config.port, function () {
    console.log('WS server is listening on port: ' + config.port);
});

var connections = [];

server.on('request', function (request) {
    var username = JSON.parse(request.origin).username;
    if (JSON.parse(request.origin).password != fs.readFileSync(config.password).toString().trim()) {
        conn.sendUTF('Wrong password.');
        conn.close();
        return;
    }
    var connection = request.accept('echo-protocol', request.origin);
    connection.id = generateID();
    connection.username = username;
    connections.push(connection);

    console.log(`${require('./modules/getTime.js')} ${username} connected (ConnectionID: ${connection.id})`);
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            // itt lesz majd a kérés feldolgozása
        }
    });

    connection.on('close', function (reasonCode, description) {
        console.log(`${require('./modules/getTime.js')} ${connection.username} from ${connections.remoteAddress} disconnected.`);
        connections[connection.id] = 'disconnected';
    });

});

function generateID() {
    var i = 0;
    while (i < connections.length) { i++ };
    return i;
}