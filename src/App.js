import React, { Component } from 'react';
import WebRTCPeer from './utils/WebRTCPeer';
import Socket from './utils/Socket';
import PeerBubble from './components/PeerBubble';
import HistorySlab from './components/HistorySlab';
import SearchBar from './components/SearchBar';
import './App.scss';

export default class App extends Component {
  state = {
    remoteSocketsList: [],
    history: {},
    searchInput: ''
  };

  webRTCPeers = {};

  constructor() {
    super();
    this.socket = new Socket(`${ window.location.protocol }//${ window.location.hostname }${ window.location.port !== '' && `:${ window.location.port }` }`).client;
    this.handleSocketConnection(this.socket);

    // Override browser event handling for dragover and drop events
    window.addEventListener('dragover', ev => {
      ev.preventDefault();
    }, false);

    window.addEventListener('drop', ev => {
      ev.preventDefault();
    }, false);
  }

  /**
   * Handles the connection events between the socket client and its remote server
   * @param {Socket} socket - Socket to handle socket.io connections
   */
  handleSocketConnection = socket => {
    // Event listener to handle a remote client connection request
    socket.on('peer-signaling', ({ remotePeerId, signalingData }) => {
      if (this.webRTCPeers[remotePeerId] === undefined) {
        this.newPeer(remotePeerId, false);
      }
      this.webRTCPeers[remotePeerId].handleSignalingReceived(signalingData);
    });

    // Event listener for new available peers on the local network
    socket.on('available-peer', data => {
      if (this.state.remoteSocketsList.indexOf(data) === -1) {
        this.setState(oldState => {
          return {
            remoteSocketsList: [data, ...oldState.remoteSocketsList]
          };
        });
      }
    });
    
    // Event listener for peer disconnection
    socket.on('disconnected-peer', data => {
      this.setState(oldState => {
        return {
          remoteSocketsList: oldState.remoteSocketsList.filter(client => client.socketId !== data)
        };
      });
    });

    // Event listener for the full list of peers on the same local network
    socket.on('list-of-peers', data => {
      this.setState({
        remoteSocketsList: data
      });
    });
  };

  /**
   * Establishes a new WebRTC connection with a remote peer
   * @param {string} remotePeerId - Remote socket.io client ID to send signaling data
   * @param {boolean} initiator - Indicates wheter this peer is the connection initiator
   */
  newPeer = (remotePeerId, initiator) => {
    const peer = new WebRTCPeer(this.socket, initiator, remotePeerId, this.updateHistory);
    this.webRTCPeers[remotePeerId] = peer;
    this.setState(oldState => ({
      history: {
        ...oldState.history,
        [remotePeerId]: []
      }
    }));
  }

  /**
   * Handle file-dropping into a peer
   * @param {File[]} filesList
   * @param {string} remotePeerId - Remote socket.io client ID to connect
   */
  onFileDrop = (filesList, remotePeerId) => {
    if (this.webRTCPeers[remotePeerId] === undefined) {
      this.newPeer(remotePeerId, true);
      this.webRTCPeers[remotePeerId].listen('connect', () => {
        filesList.forEach(file => {
          this.webRTCPeers[remotePeerId].sendFile(file);
        });    
      });
    } else {
      filesList.forEach(file => {
        this.webRTCPeers[remotePeerId].sendFile(file);
      });
    }
  };

  /**
   * Handle broadcasting to all available peers on the local network
   * @param {File[]} filesList
   */
  broadcast = filesList => {
    this.state.remoteSocketsList.forEach(client => this.onFileDrop(filesList, client.socketId));
  };

  /**
   * Updates the file transmission history of each peer
   * @param {string} remotePeerId
   * @param {Object} fileMetadata - Metadata of the file
   * @param {string} fileMetadata.name - File name (including extension)
   * @param {boolean} incoming - Indicates wheter we're receiving or sending the file
   */
  updateHistory = (remotePeerId, fileMetadata, incoming) => {
    this.setState(oldState => ({
      history: {
        ...oldState.history,
        [remotePeerId]: [...oldState.history[remotePeerId], { fileName: fileMetadata.name, date: new Date(), incoming }]
      }
    }));
  };

  /**
   * Handles search form user input
   * @param {Event} ev
   */
  onSearchInput = ev => {
    this.setState({
      searchInput: ev.target.value.toLowerCase()
    });
  };

  /**
   * Renders the list of available peers based on the current state
   */
  renderAvailablePeers = () => {
    if (this.state.searchInput === '') {
      return this.state.remoteSocketsList.map(client => <PeerBubble clientId={ client.socketId } handleDrop={ this.onFileDrop } handleClick={ this.selectFileOnClick } userAgent={ client.userAgent } key={client.socketId}/>);
    }
    const filteredList = this.state.remoteSocketsList.filter(client => client.socketId.toLowerCase().indexOf(this.state.searchInput) !== -1);
    if (filteredList.length) {
      return filteredList.map(client => <PeerBubble clientId={ client.socketId } handleDrop={ this.onFileDrop } handleClick={ this.selectFileOnClick } userAgent={ client.userAgent } key={client.socketId}/>);
    }
    return <div className="peers-list__no-match">There is no peer with ID <span>"{ this.state.searchInput }"</span></div>;
  };

  /**
   * Renders the transmissions history based on the current state
   */
  renderHistory = () => {
    const dropsHistoryClients = Object.keys(this.state.history);
    if (dropsHistoryClients.length) {
      return dropsHistoryClients.map(clientId => {
        const clientHistory = this.state.history[clientId];
        if (clientHistory.length) { 
          return <HistorySlab clientId={ clientId } lastDrop={ clientHistory[clientHistory.length - 1] } key={ clientId } />;
        }
      })
    }
    return <div className="drops-history__no-match">No drops yet!</div>;
  };

  /**
   * Handles file selection through the browser file selection prompt
   * @param {string=null} remotePeerId - Remote client socket ID to send the file(s)
   */
  selectFileOnClick = (remotePeerId = null) => {
    const fileInput = document.querySelector('input[type="file"]');
    fileInput.addEventListener('change', function listener(event) {
      const filesArray = [];
      Object.keys(fileInput.files).forEach(file => {
        filesArray.push(fileInput.files[file]);
      });
      if (remotePeerId === null) {
        this.broadcast(filesArray);
      } else {
        this.onFileDrop(filesArray, remotePeerId);
      }
      fileInput.removeEventListener('change', listener);
    }.bind(this));
    fileInput.click();
  };

  render() {
    return(
      <div className="App">
        <div className="header">
          <h2 className="header__title">Droppie</h2>
          <div className="header__user-avatar"></div>
        </div>
        <div className="top-actions">
          <button className="top-actions__button" onClick={ () => this.selectFileOnClick() }>Broadcast</button>
          <button className="top-actions__button">New group</button>
        </div>
        <div className="available-peers">
          <SearchBar placeholder="Search" onChange={ ev => this.onSearchInput(ev) } value={ this.state.searchInput } />
          <div className="peers-list">
            { this.renderAvailablePeers() }
          </div>
        </div>
        <div className="drops-history">
          { this.renderHistory() }
        </div>
        <input className="file-input" type="file" />
      </div>
    );
  } 
}
