import React from 'react';
import PeerBubble from '../PeerBubble';
import './index.scss';

const HistorySlab = props => {
    return(
        <div className="HistorySlab">
            <div className="HistorySlab__contact-avatar">
                <PeerBubble clientId={ props.clientId } />
            </div>
            <div className="HistorySlab__information">
                <div className="HistorySlab__information--top"><div>{ props.clientId }</div><div>{ props.lastDrop.date.getHours() }:{ props.lastDrop.date.getMinutes() }</div></div>
                <div className="HistorySlab__information--bottom">{ props.lastDrop.fileName }</div>
            </div>
        </div>
    );
};

export default HistorySlab;