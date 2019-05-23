const { filterSockets } = require('./utils');
const path = require('path');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
var useragent = require('useragent');

server.listen(4000, '0.0.0.0');
app.listen(process.env.PORT || 8080);

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