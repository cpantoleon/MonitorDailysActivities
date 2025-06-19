// src/components/AddNewRequirementModal.jsx
import React, { useState, useEffect } from 'react';

const AddNewRequirementModal = ({ isOpen, onClose, formData, onFormChange, onSubmit, projects }) => {
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [internalProjectValue, setInternalProjectValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      const isExistingProject = projects.includes(formData.project);
      // Show input if: no projects exist OR formData.project is not in existing list (and not empty) OR formData.project is empty (meaning user wants to type or selected custom)
      const shouldShowInputInitially = projects.length === 0 ||
                                     (formData.project && !isExistingProject) ||
                                     (formData.project === '' && projects.length > 0); // Covers custom selection or initial empty

      if (formData.project === 'custom') { // Specifically handle 'custom' selection
          setShowNewProjectInput(true);
          setInternalProjectValue('');
          // Parent's formData.project should be cleared by handleProjectSelectionChange
      } else if (shouldShowInputInitially) {
          setShowNewProjectInput(true);
          setInternalProjectValue(formData.project);
      } else { // Is an existing project or default selection
          setShowNewProjectInput(false);
          setInternalProjectValue('');
          // If formData.project is empty but we have projects and not showing input, default to first
          if (formData.project === '' && projects.length > 0) {
            onFormChange({ target: { name: 'project', value: projects[0] } });
          }
      }
    } else {
      setShowNewProjectInput(false);
      setInternalProjectValue('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projects, formData.project]); // formData.project is needed to react to parent changes

  const handleProjectSelectionChange = (e) => {
    const { value } = e.target;
    if (value === 'custom') {
      setShowNewProjectInput(true);
      setInternalProjectValue('');
      onFormChange({ target: { name: 'project', value: '' } });
    } else {
      setShowNewProjectInput(false);
      setInternalProjectValue('');
      onFormChange({ target: { name: 'project', value: value } });
    }
  };

  const handleNewProjectInputChange = (e) => {
    const { value } = e.target;
    setInternalProjectValue(value);
    onFormChange({ target: { name: 'project', value: value } });
  };

  const handleNewProjectCheckboxChange = (e) => {
    const checked = e.target.checked;
    setShowNewProjectInput(checked);
    if (checked) {
      // If checking the box, and current formData.project is an existing one, clear it for typing.
      // Otherwise, keep what might already be a new project name in internalProjectValue.
      const currentValInForm = formData.project;
      const newInternalValue = (currentValInForm && !projects.includes(currentValInForm) && currentValInForm !== 'custom')
                                ? currentValInForm
                                : '';
      setInternalProjectValue(newInternalValue);
      onFormChange({ target: { name: 'project', value: newInternalValue } });
    } else {
      // When unchecking, revert to first available project or empty
      const newProjectValue = projects.length > 0 ? projects[0] : '';
      setInternalProjectValue('');
      onFormChange({ target: { name: 'project', value: newProjectValue } });
    }
  };

  if (!isOpen) return null;
  const statusOptions = ['To Do', 'Scenarios created', 'Under testing', 'Done'];

 return (
    <div className="add-new-modal-overlay">
      <div className="add-new-modal-content">
        <h2>Add New Requirement</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          
          <div className="form-group">
            <label htmlFor="newReqProjectSelect">Project:</label>
            <select
              id="newReqProjectSelect"
              name="project"
              value={formData.project}
              onChange={onFormChange}
              required
              disabled={projects.length === 0}
            >
              {projects.length === 0 ? (
                 <option value="">-- No projects available --</option>
              ) : (
                <option value="">-- Select a Project --</option>
              )}
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="newReqName">Requirement Name:</label>
            <input
              type="text"
              id="newReqName"
              name="requirementName"
              value={formData.requirementName}
              onChange={onFormChange}
              placeholder="e.g., User Login Feature GIV-INT-01"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="newReqStatus">Status:</label>
            <select id="newReqStatus" name="status" value={formData.status} onChange={onFormChange} required>
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="newReqSprint">Sprint:</label>
            <input 
              type="text" 
              id="newReqSprint" 
              name="sprint" 
              value={formData.sprint} 
              onChange={onFormChange} 
              placeholder="e.g., Sprint 1 or 2024.Q1.S1" 
              required 
            />
          </div>

          {/* --- CHANGE: Add input field for the link --- */}
          <div className="form-group">
            <label htmlFor="newReqLink" className="optional-label">Link (e.g., JIRA):</label>
            <input
              type="url"
              id="newReqLink"
              name="link"
              value={formData.link}
              onChange={onFormChange}
              placeholder="https://example.com/issue/123"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newReqComment" className="optional-label">Comment:</label>
            <textarea 
              id="newReqComment" 
              name="comment" 
              value={formData.comment} 
              onChange={onFormChange} 
              rows="3" 
              placeholder="Initial comment (optional)" 
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="modal-button-save">Add Requirement</button>
            <button type="button" onClick={onClose} className="modal-button-cancel">Cancel</button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddNewRequirementModal;