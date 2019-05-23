import io from 'socket.io-client';

/**
 * Creates a new Socket
 */
export default class Socket {
    /**
     * @param {string} serverUrl - URL of the remote socket.io server
     */
    constructor(serverUrl) {
        this.client = io(serverUrl);
    }
}