import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import Tooltip from './Tooltip';
import useClickOutside from '../hooks/useClickOutside';
import ConfirmationModal from './ConfirmationModal';

const EditRequirementModal = ({ isOpen, onClose, onSave, requirement, releases }) => {
  const [formData, setFormData] = useState({});
  const [initialFormData, setInitialFormData] = useState(null);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

  useEffect(() => {
    if (requirement && isOpen) {
      const currentSprint = requirement.currentStatusDetails?.sprint || '';
      const isBacklog = currentSprint === 'Backlog';
      let sprintNumber = '1';

      if (!isBacklog && currentSprint.startsWith('Sprint ')) {
        sprintNumber = currentSprint.split(' ')[1] || '1';
      }

      const initialData = {
        name: requirement.requirementUserIdentifier || '',
        comment: requirement.currentStatusDetails?.comment || '',
        sprint: sprintNumber,
        status: requirement.currentStatusDetails?.status || '',
        link: requirement.currentStatusDetails?.link || '',
        isBacklog: isBacklog,
        type: requirement.currentStatusDetails?.type || '',
        tags: requirement.currentStatusDetails?.tags || '',
        release_id: requirement.currentStatusDetails?.releaseId || '',
      };
      setFormData(initialData);
      setInitialFormData(initialData);
    }
  }, [requirement, isOpen]);

  const hasUnsavedChanges = useMemo(() => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  const handleCloseRequest = () => {
    if (hasUnsavedChanges) {
      setIsCloseConfirmOpen(true);
    } else {
      onClose();
    }
  };

  const modalRef = useClickOutside(handleCloseRequest);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };
  
  const handleSelectChange = (name, selectedOption) => {
    setFormData(prev => ({...prev, [name]: selectedOption ? selectedOption.value : '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen || !requirement) return null;

  const sprintNumberOptions = Array.from({ length: 20 }, (_, i) => ({ value: `${i + 1}`, label: `${i + 1}` }));
  const statusOptions = ['To Do', 'Scenarios created', 'Under testing', 'Done'].map(s => ({ value: s, label: s }));
  const typeOptions = ['Change Request', 'Task', 'Bug', 'Story'].map(t => ({ value: t, label: t }));
  const releaseOptions = releases.map(r => ({ value: r.id, label: `${r.name} ${r.is_current ? '(Current)' : ''}` }));
  const customSelectStyles = {
    menuList: (base) => ({ ...base, maxHeight: '180px', overflowY: 'auto' }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  };
  const releaseTooltipContent = (
    <>
      <strong>Assign to a Release</strong>
      <p>Associate this requirement with a release. The release marked '(Current)' is the one actively designated for the project.</p>
    </>
  );

  return (
    <>
      <div className="add-new-modal-overlay">
        <div ref={modalRef} className="add-new-modal-content">
          <h2>Edit Requirement</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="editReqName">Requirement Name:</label>
              <input type="text" id="editReqName" name="name" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="editReqType" className="optional-label">Type:</label>
              <Select id="editReqType" name="type" value={typeOptions.find(opt => opt.value === formData.type)} onChange={(option) => handleSelectChange('type', option)} options={typeOptions} styles={customSelectStyles} menuPortalTarget={document.body} placeholder="-- Select Type --" isClearable />
            </div>
            <div className="form-group">
              <label htmlFor="editReqComment" className="optional-label">Current Comment:</label>
              <textarea id="editReqComment" name="comment" value={formData.comment || ''} onChange={handleChange} rows="4" placeholder="Enter a comment for the current status" />
            </div>
            <div className="form-group">
              <label htmlFor="editReqSprint">Sprint:</label>
              <Select id="editReqSprint" name="sprint" value={sprintNumberOptions.find(opt => opt.value === formData.sprint)} onChange={(option) => handleSelectChange('sprint', option)} options={sprintNumberOptions} isDisabled={formData.isBacklog} styles={customSelectStyles} menuPortalTarget={document.body} />
            </div>
            <div className="form-group new-project-toggle">
              <input type="checkbox" id="isBacklogCheckboxEdit" name="isBacklog" checked={formData.isBacklog || false} onChange={handleChange} />
              <label htmlFor="isBacklogCheckboxEdit" className="checkbox-label optional-label">Assign to Backlog</label>
            </div>
            <div className="form-group">
              <label htmlFor="editReqStatus">Status:</label>
              <Select id="editReqStatus" name="status" value={statusOptions.find(opt => opt.value === formData.status)} onChange={(option) => handleSelectChange('status', option)} options={statusOptions} styles={customSelectStyles} menuPortalTarget={document.body} required />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <label htmlFor="editReqRelease" className="optional-label" style={{marginBottom: 0}}>Release:</label>
                <Tooltip content={releaseTooltipContent} className="release" />
              </div>
              <Select
                id="editReqRelease"
                name="release_id"
                value={releaseOptions.find(opt => opt.value === formData.release_id)}
                onChange={(option) => handleSelectChange('release_id', option)}
                options={releaseOptions}
                isDisabled={releases.length === 0}
                styles={customSelectStyles}
                menuPortalTarget={document.body}
                placeholder={releases.length === 0 ? "-- No releases for this project --" : "-- Select a Release --"}
                isClearable={false}
              />
            </div>
            <div className="form-group">
              <label htmlFor="editReqTags" className="optional-label">Tags:</label>
              <input type="text" id="editReqTags" name="tags" value={formData.tags || ''} onChange={handleChange} placeholder="e.g., Sprint 4, PreA Tools" />
            </div>
            <div className="form-group">
              <label htmlFor="editReqLink" className="optional-label">Link (e.g., JIRA):</label>
              <input type="url" id="editReqLink" name="link" value={formData.link || ''} onChange={handleChange} placeholder="https://example.com/issue/123" />
            </div>
            <div className="modal-actions">
              <button type="submit" className="modal-button-save">Save Changes</button>
              <button type="button" onClick={onClose} className="modal-button-cancel">Cancel</button>
            </div>
          </form>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isCloseConfirmOpen}
        onClose={() => setIsCloseConfirmOpen(false)}
        onConfirm={() => {
          setIsCloseConfirmOpen(false);
          onClose();
        }}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close?"
      />
    </>
  );
};

export default EditRequirementModal;