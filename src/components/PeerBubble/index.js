import React from 'react';
import './index.scss';

const PeerBubble = props => {
  return(
    <div className="PeerBubble" onDrop={ ev => props.handleDrop([...ev.dataTransfer.items].map(item => item.getAsFile()), props.clientId) } onClick={ () => props.handleClick(props.clientId) }>
      <div className="PeerBubble__bubble">{props.clientId.slice(0,5)}...</div>
      { props.userAgent && (
        <div className="PeerBubble__device-info">
          <span>{ props.userAgent.os.length > 6 ? `${props.userAgent.os.slice(0,6)}...` : props.userAgent.os }</span>
          <span>{ props.userAgent.browser.length > 6 ? `${props.userAgent.browser.slice(0,6)}...` : props.userAgent.browser }</span>
        </div> )}
    </div>
  );
};

export default PeerBubble;