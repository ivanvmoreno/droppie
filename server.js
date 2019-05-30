const { filterSockets, handleInsecureConnection } = require('./utils');
const path = require('path');
const fs = require('fs');
const express = require('express');
const app = express();
const useragent = require('useragent');
var io = require('socket.io');

if (process.env.DEV) {
    // HTTP (dev) Server
    const httpServer = require('http')
    .createServer(app)
    .listen(8080, '0.0.0.0');

    io = io(httpServer);
} else {
    // HTTP (secure) Server
    const secureServer = require('https')
    .createServer({ key: fs.readFileSync('/etc/letsencrypt/live/www.droppie.app-0001/privkey.pem'), cert: fs.readFileSync('/etc/letsencrypt/live/www.droppie.app-0001/fullchain.pem') }, app)
    .listen(443, '0.0.0.0');
    
    io = io(secureServer);
    
    // HTTP (insecure) Server
    const httpServer = require('http')
    .createServer(handleInsecureConnection)
    .listen(80);
}


app.use(express.static(path.join(__dirname, 'build')));

// Express server endpoints
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'build', 'index.html')));

// Socket.io connection handler
io.on('connection', socket => {
    const socketId = socket.id;
    const agent = useragent.parse(socket.handshake.headers['user-agent']);
    
    // Filter through all connected clients and find the ones on the same local network
    let { socketsArray, idArray } = filterSockets(io.sockets.connected, socketId, socket.handshake.address);
    
    // Provide a list of all available clients in its local network
    socket.emit('list-of-peers', idArray);
    
    // Notify the rest of the clients a new peer has connected
    socketsArray.forEach(socket => socket.emit('available-peer', { socketId, userAgent: { os: agent.os.family, browser: agent.family } }));
    
    // Handle signaling messages between peers
    socket.on('peer-signaling', data => {
        const { remotePeerId, signalingData } = JSON.parse(data);
        const payload = {
            signalingData,
            remotePeerId: socketId
        };
        const clientSocket = io.sockets.connected[remotePeerId];
        clientSocket.emit('peer-signaling', payload);
    });
    
    // Handle client disconnection - Broadcast the disconnected client ID to the rest of peers
    socket.on('disconnect', () => {
        io.emit('disconnected-peer', socketId);
    });
});
