import { STORED_CLIENT_ID } from './_constants';

/**
 * Loads the socket.io client ID stored in the device localStorage
 * @returns {(string|null)}
 */
export const loadClientId = () => window.localStorage.getItem(STORED_CLIENT_ID);

/**
 * Stores the socket.io client ID in the device localStorage
 * @param {string} id - Socket.io client ID to store in localStorage
 */
export const storeClientId = id => window.localStorage.setItem(STORED_CLIENT_ID, id);