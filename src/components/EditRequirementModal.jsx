import React, { useState, useEffect } from 'react';
import Select from 'react-select';

const EditRequirementModal = ({ isOpen, onClose, onSave, requirement }) => {
  const [formData, setFormData] = useState({
    name: '',
    comment: '',
    sprint: '1',
    status: '',
    link: '',
    isBacklog: false,
  });

  const sprintNumberOptions = Array.from({ length: 20 }, (_, i) => ({
    value: `${i + 1}`,
    label: `${i + 1}`
  }));

  useEffect(() => {
    if (requirement) {
      const currentSprint = requirement.currentStatusDetails?.sprint || '';
      const isBacklog = currentSprint === 'Backlog';
      let sprintNumber = '1';

      if (!isBacklog && currentSprint.startsWith('Sprint ')) {
        sprintNumber = currentSprint.split(' ')[1] || '1';
      }

      setFormData({
        name: requirement.requirementUserIdentifier || '',
        comment: requirement.currentStatusDetails?.comment || '',
        sprint: sprintNumber,
        status: requirement.currentStatusDetails?.status || '',
        link: requirement.currentStatusDetails?.link || '',
        isBacklog: isBacklog,
      });
    }
  }, [requirement]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };
  
  const handleSprintChange = (selectedOption) => {
    setFormData(prev => ({...prev, sprint: selectedOption.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen || !requirement) return null;

  const statusOptions = ['To Do', 'Scenarios created', 'Under testing', 'Done'];

  const customSelectStyles = {
    menuList: (base) => ({
      ...base,
      maxHeight: '180px',
      overflowY: 'auto',
    }),
  };

  return (
    <div className="add-new-modal-overlay">
      <div className="add-new-modal-content">
        <h2>Edit Requirement</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="editReqName">Requirement Name:</label>
            <input
              type="text"
              id="editReqName"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="editReqComment" className="optional-label">Current Comment:</label>
            <textarea
              id="editReqComment"
              name="comment"
              value={formData.comment}
              onChange={handleChange}
              rows="4"
              placeholder="Enter a comment for the current status"
            />
          </div>
          <div className="form-group">
            <label htmlFor="editReqSprint">Sprint:</label>
            <Select
              id="editReqSprint"
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
              id="isBacklogCheckboxEdit"
              name="isBacklog"
              checked={formData.isBacklog}
              onChange={handleChange}
            />
            <label htmlFor="isBacklogCheckboxEdit" className="checkbox-label optional-label">
              Assign to Backlog
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="editReqStatus">Status:</label>
            <select
              id="editReqStatus"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="editReqLink" className="optional-label">Link (e.g., JIRA):</label>
            <input
              type="url"
              id="editReqLink"
              name="link"
              value={formData.link}
              onChange={handleChange}
              placeholder="https://example.com/issue/123"
            />
          </div>
          <div className="modal-actions">
            <button type="submit" className="modal-button-save">Save Changes</button>
            <button type="button" onClick={onClose} className="modal-button-cancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRequirementModal;