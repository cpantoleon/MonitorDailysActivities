import React, { useState } from 'react';
import useClickOutside from '../hooks/useClickOutside';
import './SearchComponent.css';

const SearchComponent = ({ query, onQueryChange, onSearch, onClear, onSuggestionSelect, suggestions, placeholder }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (e) => {
    onQueryChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleSearchClick = () => {
    onSearch(query);
    setShowSuggestions(false);
  };

  const handleClearClick = () => {
    onClear();
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion) => {
    onSuggestionSelect(suggestion);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query && query.trim() !== '') {
        handleSearchClick();
      }
    }
  };

  const searchRef = useClickOutside(() => {
    setShowSuggestions(false);
  });

  return (
    <div className="search-container" ref={searchRef}>
      <div className="search-input-group">
        <input
          type="text"
          id="main-search-input"
          name="main-search"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder || "Search..."}
          className="search-input"
          autoComplete="off"
        />
        <button 
          type="button" 
          onClick={handleSearchClick} 
          className="search-button" 
          disabled={!query || query.trim() === ''}
        >
          Search
        </button>
        <button type="button" onClick={handleClearClick} className="search-clear-button">Clear</button>
      </div>
      {showSuggestions && suggestions && suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id || index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="suggestion-item"
            >
              {suggestion.name} <span className="suggestion-context">({suggestion.context})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchComponent;