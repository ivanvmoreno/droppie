import React from 'react';
import './index.scss';

const SearchBar = props => {
    return(
        <input className="SearchBar" type="text" placeholder={ props.placeholder } value={ props.value } onChange={ props.onChange }></input>
    );
};

export default SearchBar;