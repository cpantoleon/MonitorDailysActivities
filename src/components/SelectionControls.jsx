import React from 'react';

const SelectionControls = () => {
  return (
    <div className="selection-controls">
      <div className="selection-group">
        <span className="dropdown-label">drop down selection</span>
        <span className="main-label">Project Selection</span>
        {/* In a real app, this would be a <select> or custom dropdown component */}
      </div>
      <div className="selection-group">
        <span className="dropdown-label">drop down selection</span>
        <span className="main-label">Sprint</span>
        {/* In a real app, this would be a <select> or custom dropdown component */}
      </div>
    </div>
  );
};

export default SelectionControls;