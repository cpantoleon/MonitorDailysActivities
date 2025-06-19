import React from 'react';

const SprintSelector = ({ sprints, selectedSprint, onSelectSprint, disabled }) => {
  return (
    <div className="selection-group">
      <span className="dropdown-label">Sprint Selection</span>
      <select
        value={selectedSprint}
        onChange={(e) => onSelectSprint(e.target.value)}
        className="main-label"
        disabled={disabled || sprints.length === 0}
      >
        <option value="">-- Select Sprint --</option>
        {sprints.map(sprint => (
          <option key={sprint} value={sprint}>{sprint}</option>
        ))}
      </select>
    </div>
  );
};

export default SprintSelector;