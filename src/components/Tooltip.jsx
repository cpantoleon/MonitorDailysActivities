import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';

const Tooltip = ({ content }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);

  const handleMouseEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({
        // Position the top of the tooltip at the vertical center of the icon
        top: rect.top + rect.height / 2,
        // Position the left of the tooltip to the right of the icon, plus an 8px gap
        left: rect.right + 8,
      });
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const tooltipContent = (
    <div 
      className="tooltip-text-portal" 
      style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
    >
      {content}
    </div>
  );

  return (
    <>
      <span 
        ref={iconRef}
        className="tooltip-icon"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        ?
      </span>
      {isHovered && ReactDOM.createPortal(tooltipContent, document.body)}
    </>
  );
};

export default Tooltip;