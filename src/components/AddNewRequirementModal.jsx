import React from 'react';
import Select from 'react-select';

const AddNewRequirementModal = ({ isOpen, onClose, formData, onFormChange, onSubmit, projects }) => {
  if (!isOpen) return null;

  const projectOptions = projects.map(p => ({ value: p, label: p }));
  const statusOptions = ['To Do', 'Scenarios created', 'Under testing', 'Done'].map(s => ({ value: s, label: s }));
  const typeOptions = ['Change Request', 'Task', 'Bug', 'Story'].map(t => ({ value: t, label: t }));
  const sprintNumberOptions = Array.from({ length: 20 }, (_, i) => ({
    value: `${i + 1}`,
    label: `${i + 1}`
  }));

  const handleSelectChange = (name, selectedOption) => {
    onFormChange({ target: { name, value: selectedOption ? selectedOption.value : '' } });
  };

  const customSelectStyles = {
    menuList: (base) => ({
      ...base,
      maxHeight: '180px',
      overflowY: 'auto',
    }),
    menuPortal: (base) => ({ 
      ...base, 
      zIndex: 9999 
    }),
  };

  return (
    <div className="add-new-modal-overlay">
      <div className="add-new-modal-content">
        <h2>Add New Requirement</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          
          <div className="form-group">
            <label htmlFor="newReqProjectSelect">Project:</label>
            <Select
              id="newReqProjectSelect"
              name="project"
              value={projectOptions.find(opt => opt.value === formData.project)}
              onChange={(option) => handleSelectChange('project', option)}
              options={projectOptions}
              isDisabled={projects.length === 0}
              styles={customSelectStyles}
              menuPortalTarget={document.body}
              placeholder={projects.length === 0 ? "-- No projects available --" : "-- Select a Project --"}
              required
            />
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
            <label htmlFor="newReqType" className="optional-label">Type:</label>
            <Select
              id="newReqType"
              name="type"
              value={typeOptions.find(opt => opt.value === formData.type)}
              onChange={(option) => handleSelectChange('type', option)}
              options={typeOptions}
              styles={customSelectStyles}
              menuPortalTarget={document.body}
              placeholder="-- Select Type --"
              isClearable
            />
          </div>

          <div className="form-group">
            <label htmlFor="newReqStatus">Status:</label>
            <Select
              id="newReqStatus"
              name="status"
              value={statusOptions.find(opt => opt.value === formData.status)}
              onChange={(option) => handleSelectChange('status', option)}
              options={statusOptions}
              styles={customSelectStyles}
              menuPortalTarget={document.body}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="newReqSprint">Sprint:</label>
            <Select
              id="newReqSprint"
              name="sprint"
              value={sprintNumberOptions.find(opt => opt.value === formData.sprint)}
              onChange={(option) => handleSelectChange('sprint', option)}
              options={sprintNumberOptions}
              isDisabled={formData.isBacklog}
              styles={customSelectStyles}
              menuPortalTarget={document.body}
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
            <label htmlFor="newReqTags" className="optional-label">Tags:</label>
            <input
              type="text"
              id="newReqTags"
              name="tags"
              value={formData.tags}
              onChange={onFormChange}
              placeholder="e.g., Sprint 4, PreA Tools"
            />
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