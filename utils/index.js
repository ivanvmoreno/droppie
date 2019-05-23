var useragent = require('useragent');

/**
 * Filters through a list of sockets by their public IP address 
 * @param {Hash} socketsHash - Hash of Socket objects to filter
 * @param {string} clientId - Client ID to exclude from the list
 * @param {string} publicIp - Public IP address to find ocurrences with
 * @returns {Socket[]} Array containing matches
 */
exports.filterSockets = (socketsHash, clientId, publicIp) => {
    const socketsArray = [];
    const idArray = [];
    Object.keys(socketsHash).forEach(socketId => {
        if (socketsHash[socketId].handshake.address === publicIp && socketId !== clientId) {
            const agent = useragent.parse(socketsHash[socketId].handshake.headers['user-agent']);
            socketsArray.push(socketsHash[socketId]);
            idArray.push({
                socketId,
                userAgent: { os: agent.os.family, browser: agent.family }
            });
        }
    });
    return { socketsArray, idArray };
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