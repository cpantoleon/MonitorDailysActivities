import React from 'react';
import Select from 'react-select';

const AddNewRequirementModal = ({ isOpen, onClose, formData, onFormChange, onSubmit, projects }) => {
  if (!isOpen) return null;

  const statusOptions = ['To Do', 'Scenarios created', 'Under testing', 'Done'];
  const sprintNumberOptions = Array.from({ length: 20 }, (_, i) => ({
    value: `${i + 1}`,
    label: `${i + 1}`
  }));

  const handleSprintChange = (selectedOption) => {
    onFormChange({ target: { name: 'sprint', value: selectedOption.value } });
  };

  const customSelectStyles = {
    menuList: (base) => ({
      ...base,
      maxHeight: '180px', // Shows about 5-6 items
      overflowY: 'auto',
    }),
  };

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
            <Select
              id="newReqSprint"
              name="sprint"
              value={sprintNumberOptions.find(opt => opt.value === formData.sprint)}
              onChange={handleSprintChange}
              options={sprintNumberOptions}
              isDisabled={formData.isBacklog}
              styles={customSelectStyles}
            />
          </div>

          <div className="form-group new-project-toggle">
            <input
              type="checkbox"
              id="isBacklogCheckbox"
              name="isBacklog"
              checked={formData.isBacklog}
              onChange={onFormChange}
            />
            <label htmlFor="isBacklogCheckbox" className="checkbox-label optional-label">
              Assign to Backlog
            </label>
          </div>

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