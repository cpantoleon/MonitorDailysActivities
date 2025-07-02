import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import Tooltip from './Tooltip';
import useClickOutside from '../hooks/useClickOutside';
import ConfirmationModal from './ConfirmationModal';

const AddNewRequirementModal = ({ isOpen, onClose, formData, onFormChange, onSubmit, projects, releases }) => {
  const [initialFormData, setInitialFormData] = useState(null);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInitialFormData(formData);
    }
  }, [isOpen, formData]);

  // This effect resets the release selection when the project changes.
  useEffect(() => {
    if (initialFormData && formData.project !== initialFormData.project) {
        onFormChange({ target: { name: 'release_id', value: '' } });
    }
  }, [formData.project]);


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

  const releaseOptions = useMemo(() => {
    if (!formData.project) return [];
    return releases
      .filter(r => r.project === formData.project)
      .map(r => ({
        value: r.id,
        label: `${r.name} ${r.is_current ? '(Current)' : ''}`
      }));
  }, [formData.project, releases]);


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
              <input type="text" id="newReqName" name="requirementName" value={formData.requirementName} onChange={onFormChange} placeholder="e.g., User Login Feature GIV-INT-01" required />
            </div>
            <div className="form-group">
              <label htmlFor="newReqType" className="optional-label">Type:</label>
              <Select id="newReqType" name="type" value={typeOptions.find(opt => opt.value === formData.type)} onChange={(option) => handleSelectChange('type', option)} options={typeOptions} styles={customSelectStyles} menuPortalTarget={document.body} placeholder="-- Select Type --" isClearable />
            </div>
            <div className="form-group">
              <label htmlFor="newReqStatus">Status:</label>
              <Select id="newReqStatus" name="status" value={statusOptions.find(opt => opt.value === formData.status)} onChange={(option) => handleSelectChange('status', option)} options={statusOptions} styles={customSelectStyles} menuPortalTarget={document.body} required />
            </div>
            <div className="form-group">
              <label htmlFor="newReqSprint">Sprint:</label>
              <Select id="newReqSprint" name="sprint" value={sprintNumberOptions.find(opt => opt.value === formData.sprint)} onChange={(option) => handleSelectChange('sprint', option)} options={sprintNumberOptions} isDisabled={formData.isBacklog} styles={customSelectStyles} menuPortalTarget={document.body} />
            </div>
            <div className="form-group new-project-toggle">
              <input type="checkbox" id="isBacklogCheckbox" name="isBacklog" checked={formData.isBacklog} onChange={onFormChange} />
              <label htmlFor="isBacklogCheckbox" className="checkbox-label optional-label">Assign to Backlog</label>
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <label htmlFor="newReqRelease" className="optional-label" style={{marginBottom: 0}}>Release:</label>
                <Tooltip content={releaseTooltipContent} className="release" />
              </div>
              <Select
                id="newReqRelease"
                name="release_id"
                value={releaseOptions.find(opt => opt.value === formData.release_id)}
                onChange={(option) => handleSelectChange('release_id', option)}
                options={releaseOptions}
                isDisabled={!formData.project || releaseOptions.length === 0}
                styles={customSelectStyles}
                menuPortalTarget={document.body}
                placeholder={!formData.project ? "-- Select a project first --" : (releaseOptions.length === 0 ? "-- No releases for this project --" : "-- Select a Release --")}
                isClearable={false}
              />
            </div>
            <div className="form-group">
              <label htmlFor="newReqTags" className="optional-label">Tags:</label>
              <input type="text" id="newReqTags" name="tags" value={formData.tags} onChange={onFormChange} placeholder="e.g., Sprint 4, PreA Tools" />
            </div>
            <div className="form-group">
              <label htmlFor="newReqLink" className="optional-label">Link (e.g., JIRA):</label>
              <input type="url" id="newReqLink" name="link" value={formData.link} onChange={onFormChange} placeholder="https://example.com/issue/123" />
            </div>
            <div className="form-group">
              <label htmlFor="newReqComment" className="optional-label">Comment:</label>
              <textarea id="newReqComment" name="comment" value={formData.comment} onChange={onFormChange} rows="3" placeholder="Initial comment (optional)" />
            </div>
            <div className="modal-actions">
              <button type="submit" className="modal-button-save">Add Requirement</button>
              <button type="button" onClick={handleCloseRequest} className="modal-button-cancel">Cancel</button>
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

export default AddNewRequirementModal;