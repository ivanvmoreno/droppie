const { handleClientDiscovery, notifyUpdatedId, handleInsecureConnection, handlePeerSignaling, mapCustomId, unmapCustomId } = require('./utils');
const path = require('path');
const fs = require('fs');
const express = require('express');
const app = express();
const useragent = require('useragent');
var io = require('socket.io');

if (process.env.DEV) {
    // HTTP (development) Server
    const httpServer = require('http').createServer(app).listen(8080, '0.0.0.0');

    io = io(httpServer);
} else {
    // HTTP (secure) Server
    const secureServer = require('https')
    .createServer({ key: fs.readFileSync('/etc/letsencrypt/live/www.droppie.app-0001/privkey.pem'), cert: fs.readFileSync('/etc/letsencrypt/live/www.droppie.app-0001/fullchain.pem') }, app)
    .listen(443, '0.0.0.0');
    
    io = io(secureServer);
    
    // HTTP (insecure) Server
    const httpServer = require('http').createServer(handleInsecureConnection).listen(80);
}

app.use(express.static(path.join(__dirname, 'build')));

// Express server endpoints
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'build', 'index.html')));

// Socket.io connection handler
io.on('connection', socket => {
    handleClientDiscovery(io.sockets.connected, socket);
    
    // Set a custom ID for this client and notify all local network peers of this change
    socket.on('set-custom-id', ({ customId }) => {
        notifyUpdatedId(io.sockets.connected, socket, customId);
        socket.customId = customId;
    });

    // Handle signaling exchange between peers
    socket.on('peer-signaling', data => handlePeerSignaling(data, socket.id, io.sockets.connected));
    
    // Handle client disconnection - Broadcast the disconnected client ID to the rest of peers
    socket.on('disconnect', () => {
        io.emit('disconnected-peer', socket.customId || socket.id);
    });
});
