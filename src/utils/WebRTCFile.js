import { saveAs } from 'file-saver';

/**
 * Creates a new WebRTCFile
 */
export default class WebRTCFile {
    chunksArray = [];

    /**
     * @param {Object} fileMetadata
     * @param {number} fileMetadata.id - Unique file ID
     * @param {string} fileMetadata.type - MIME type of the file
     * @param {string} fileMetadata.name - Filename of the file
     * @param {number} fileMetadata.chunksNumber - Number of chunks in which the file is splitted
     * @param {number} fileMetadata.size - Total file size in bytes
     */
    constructor({ id, type, name, chunksNumber, size }) {
        this.id = id;
        this.type = type;
        this.name = name;
        this.chunksNumber = chunksNumber;
        this.receivedBytes = 0;
        this.size = size;
    }

    /**
     * Handles chunk reception
     * @param {Uint8Array} chunk
     */
    handleChunk = chunk => {
        if (chunk[0] === this.id && chunk[1] < this.chunksNumber) {
            const unsignaledChunk = chunk.slice(2);
            this.chunksArray[chunk[1]] = { typedArray: unsignaledChunk, bytesPosition: this.receivedBytes };
            this.updateReceivedBytes(unsignaledChunk.byteLength);
        }
    }

    /** 
     * Updates the total received bytes
     * @param {number} bytes - Amount of bytes received
     */
    updateReceivedBytes = bytes => {
        this.receivedBytes += bytes;
        if (this.receivedBytes === this.size) {
            this.saveToDisk();
        }
    };

    /**
     * Save final file to disk
     */
    saveToDisk = () => {
        if (this.chunksArray.length === this.chunksNumber) {
            const completeTypedArray = new Uint8Array(this.size);
            this.chunksArray.forEach(chunk => completeTypedArray.set(chunk.typedArray, chunk.bytesPosition));
            saveAs(new File([completeTypedArray.buffer], this.name, { type: this.type }));
        }
    };
}