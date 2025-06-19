// src/components/EditRequirementModal.jsx
import React, { useState, useEffect } from 'react';

const EditRequirementModal = ({ isOpen, onClose, onSave, requirement }) => {
  const [formData, setFormData] = useState({
    name: '',
    comment: '',
    sprint: '',
    status: '',
    link: '', // --- CHANGE 1: Add link to form state ---
  });

  useEffect(() => {
    if (requirement) {
      setFormData({
        name: requirement.requirementUserIdentifier || '',
        comment: requirement.currentStatusDetails?.comment || '',
        sprint: requirement.currentStatusDetails?.sprint || '',
        status: requirement.currentStatusDetails?.status || '',
        link: requirement.currentStatusDetails?.link || '', // --- CHANGE 2: Populate link from requirement ---
      });
    }
  }, [requirement]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen || !requirement) return null;

  const statusOptions = ['To Do', 'Scenarios created', 'Under testing', 'Done'];

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
            <input
              type="text"
              id="editReqSprint"
              name="sprint"
              value={formData.sprint}
              onChange={handleChange}
              required
            />
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
          {/* --- CHANGE 3: Add input field for the link --- */}
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