var useragent = require('useragent');

/**
 * Handles the discovery process when a client connects for the first time
 * @param {Hash} connectedSockets - Hash of Socket objects to filter
 * @param {Socket} socket - Socket object of the new connected client
 * @param {string} socket.id - Unique client id
 * @param {string} socket.handshake - Client connection information
 */
exports.handleClientDiscovery = (connectedSockets, socket) => {
    // Filter through all connected clients and find the ones on the same local network
    const { socketsArray, idArray } = exports.filterSockets(connectedSockets, socket.id, socket.handshake.address);
    
    // Provide a list of all available clients in its local network
    socket.emit('list-of-peers', idArray);
    
    const agent = useragent.parse(socket.handshake.headers['user-agent']);
    
    // Notify the rest of the clients a new peer has connected
    socketsArray.forEach(clientSocket => clientSocket.emit('available-peer', {
        socketId: socket.customId || socket.id, 
        userAgent: { os: agent.os.family, browser: agent.family } 
    }));
};

/**
 * Filters through a list of sockets by their public IP address 
 * @param {Hash} socketsHash - Hash of Socket objects to filter
 * @param {string} clientId - (Unique) Client ID to exclude from the list
 * @param {string} publicIp - Public IP address to find ocurrences with
 * @returns {Object}
 */
exports.filterSockets = (socketsHash, clientId, publicIp) => {
    const socketsArray = [];
    const idArray = [];
    Object.keys(socketsHash).forEach(socketId => {
        if (socketsHash[socketId].handshake.address === publicIp && socketId !== clientId) {
            const agent = useragent.parse(socketsHash[socketId].handshake.headers['user-agent']);
            socketsArray.push(socketsHash[socketId]);
            idArray.push({
                socketId: socketsHash[socketId].customId || socketId,
                userAgent: { os: agent.os.family, browser: agent.family }
            });
        }
    });
    return { socketsArray, idArray };
};

/**
 * Retrieves a Socket by its custom ID
 * @param {Hash} connectedSockets - Hash of Socket objects to filter 
 * @param {string} customId - Custom Socket ID of the Socket to find
 * @returns {Socket=undefined}
 */
exports.retrieveSocketByCustomId = (connectedSockets, customId) => connectedSockets[Object.keys(connectedSockets).filter(socketId => connectedSockets[socketId].customId === customId)[0]];

/**
 * Handles the notification of an ID change to the rest of peers
 * @param {Hash} connectedSockets - Hash of Socket objects to filter
 * @param {Socket} socket - Socket object of the connected client
 * @param {string} socket.id - Unique client id
 * @param {string} newId - New ID of the client
 */
exports.notifyUpdatedId = (connectedSockets, socket, newId) => {
    const { socketsArray } = exports.filterSockets(connectedSockets, socket.id, socket.handshake.address);
    socketsArray.forEach(clientSocket => clientSocket.emit('updated-peer', {
        originalId: socket.customId || socket.id,
        customId: newId
    }));
};

/**
 * Handles signaling between potential peers
 * @param {Object} data - Incoming data from remote peer
 * @param {Object} data.signalingData - Signaling data from the remote peer
 * @param {Object} data.remotePeerId - Remote client ID (custom one if the client has updated its ID)
 * @param {String} socketId - This client unique socket.io ID
 * @param {Hash} connectedSockets - Hash of Socket objects to filter
 */
exports.handlePeerSignaling = (data, socketId, connectedSockets) => {
    let { remotePeerId, signalingData } = JSON.parse(data);
    const payload = {
        signalingData,
        remotePeerId: connectedSockets[socketId].customId || socketId
    };
    const clientSocket = exports.retrieveSocketByCustomId(connectedSockets, remotePeerId) || connectedSockets[remotePeerId];
    clientSocket.emit('peer-signaling', payload);
};

/**
 * Handles the redirection of insecure traffic (port 80) to HTTPS
 * @param {ClientRequest} req
 * @param {ClientResponse} res
 */
exports.handleInsecureConnection = (req, res) => {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
};