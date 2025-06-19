// src/components/AddProjectModal.jsx
import React, { useState, useEffect } from 'react';

const AddProjectModal = ({ isOpen, onClose, onAddProject }) => {
  const [projectName, setProjectName] = useState('');

  // Reset input when modal is opened/closed
  useEffect(() => {
    if (!isOpen) {
      setProjectName('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (projectName.trim()) {
      onAddProject(projectName.trim());
    }
  };

  if (!isOpen) return null;

  return (
    // Re-use existing modal styles for consistency
    <div className="add-new-modal-overlay">
      <div className="add-new-modal-content" style={{ maxWidth: '450px' }}>
        <h2>Add New Project</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="newProjectName">Project Name:</label>
            <input
              type="text"
              id="newProjectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter the name of the new project"
              required
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="submit" className="modal-button-save">Add Project</button>
            <button type="button" onClick={onClose} className="modal-button-cancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectModal;