import Peer from 'simple-peer';
import WebRTCFile from './WebRTCFile';
import fileToArrayBuffer from 'file-to-array-buffer';

/**
 * Creates a new WebRTCPeer
 */
export default class WebRTCPeer {
    files = {
        incoming: {},
        outgoing: {}
    };

    /**
     * @param {Socket} socket - socket.io client to handle connections with the signaling server
     * @param {boolean} initiator - Specifies if the peer is the initiator of the connection or not 
     * @param {string} remotePeerId - socket.io remote client ID to send the signaling data
     * @param {function} notifyTransmission - Allows notifying incoming and outgoing connections to the parent
     */
    constructor(socket, initiator, remotePeerId, notifyTransmission) {
        this.socket = socket;
        this.peer = new Peer({ initiator, objectMode: true });
        this.remotePeerId = remotePeerId;
        this.notifyTransmission = notifyTransmission;
        this.peer.on('signal', data => this.sendSignalingData(data));
        this.peer.on('data', data => this.handleDataReceived(data));
    }

    /**
     * Adds an event listener for a WebRTC event
     * @param {string} event
     * @param {function} fn
     */
    listen = (event, fn) => {
        this.peer.on(event, fn);
    };

    /**
     * Handles the transmission of signaling data between WebRTC peers via socket.io connection
     * @param {Object} data - Signaling data to be sent
     */
    sendSignalingData = data => {
        data = JSON.stringify({
            signalingData: data,
            remotePeerId: this.remotePeerId
        });
        this.socket.emit('peer-signaling', data);
    };

    /**
     * Handles the transmission of data between WebRTC peers via RTCDataChannel
     * @param {Object} data - Data to be sent
     */
    sendData = data => {
        if (data.byteLength === undefined) {
            data = JSON.stringify(data);
        }
        this.peer.send(data);
    };

    /**
     * Handles the reception of signaling data from a remote client
     * @param {Object} data - Data containing relevant connection information received from the remote P2P peer
     */
    handleSignalingReceived = data => {
        this.peer.signal(data);
    };

    /**
     * @param {Object} data - Data received
     */
    handleDataReceived = data => {
        if (data.byteLength === undefined) {
            data = JSON.parse(data);
            this.files.incoming[data.id] = new WebRTCFile(data);
            this.notifyTransmission(this.remotePeerId, { name: data.name }, true);
        } else {
            this.files.incoming[data[0]].handleChunk(data);
        }
    };

    /**
     * Handles the transmission of a File to the remote peer
     * @param {File} file - File to send
     */
    sendFile = async file => {
        const fileMetadata = {
            id: Math.round(Math.random() * 255),
            type: file.type,
            name: file.name,
            size: file.size,
            chunkSize: 65000,
            get chunksNumber() { return Math.ceil(this.size / this.chunkSize) }
        };
        this.sendData(fileMetadata);
        this.notifyTransmission(this.remotePeerId, { name: fileMetadata.name }, false);
        const typedArray = new Uint8Array(await fileToArrayBuffer(file));
        for (let i = 0; i < fileMetadata.chunksNumber; i++) {
            const start = i * fileMetadata.chunkSize;
            const limit = start + fileMetadata.chunkSize <= fileMetadata.size ? start + fileMetadata.chunkSize : fileMetadata.size;
            const modifiedChunk = new Uint8Array([fileMetadata.id, i, ...typedArray.slice(start, limit)]);
            this.sendData(modifiedChunk);
        }
    };
}