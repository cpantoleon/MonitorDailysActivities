import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import Tooltip from './Tooltip';

const ImportRequirementsModal = ({ isOpen, onClose, onImport, projects, releases }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetProject, setTargetProject] = useState('');
  const [targetSprint, setTargetSprint] = useState('1');
  const [targetReleaseId, setTargetReleaseId] = useState('');
  const [isBacklog, setIsBacklog] = useState(false);
  const [error, setError] = useState('');

  const sprintNumberOptions = Array.from({ length: 20 }, (_, i) => ({
    value: `${i + 1}`,
    label: `${i + 1}`
  }));

  const projectOptions = projects.map(p => ({ value: p, label: p }));
  const releaseOptions = releases.map(r => ({
    value: r.id,
    label: `${r.name} ${r.is_current ? '(Current)' : ''}`
  }));

  // Reset project-specific fields when project changes
  useEffect(() => {
    setTargetReleaseId('');
  }, [targetProject]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setError('');
  };

  const handleImport = () => {
    if (!selectedFile) {
      setError('Please select a file to import.');
      return;
    }
    if (!targetProject) {
      setError('Please select a target project.');
      return;
    }
    
    const sprintValue = isBacklog ? 'Backlog' : `Sprint ${targetSprint}`;
    onImport(selectedFile, targetProject, sprintValue, targetReleaseId);
  };

  const handleSprintChange = (selectedOption) => {
    setTargetSprint(selectedOption.value);
  };

  const handleProjectChange = (selectedOption) => {
    setTargetProject(selectedOption ? selectedOption.value : '');
  };

  const handleReleaseChange = (selectedOption) => {
    setTargetReleaseId(selectedOption ? selectedOption.value : '');
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

  const tooltipContent = (
    <>
      <strong>Excel File Format Guide:</strong>
      <ul>
        <li>Only rows with a valid type in the 'T' column will be imported. Valid types are: 'Change Request', 'Task', 'Bug', 'Story'.</li>
        <li>The 'Summary' column is required and will become the requirement's title.</li>
        <li>The 'Key' column (e.g., 'PROJ-123') is used for JIRA links and duplicate checking.</li>
        <li>If a requirement with the same 'Key' already exists, it will be imported with a modified title (e.g., "Title (1)").</li>
        <li>The 'Sprint' column can be used to add tags to the requirement.</li>
        <li>Other columns are ignored.</li>
      </ul>
    </>
  );

  if (!isOpen) return null;

  return (
    <div className="add-new-modal-overlay">
      <div className="add-new-modal-content">
        <div className="modal-header-with-tooltip">
          <h2>Import Requirements from Excel</h2>
          <Tooltip content={tooltipContent} />
        </div>
        {error && <p className="error-message-modal">{error}</p>}
        <div className="form-group">
          <label htmlFor="importFile">Excel File (.xlsx, .xls):</label>
          <input
            type="file"
            id="importFile"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="importProject">Target Project:</label>
          <Select
            id="importProject"
            value={projectOptions.find(opt => opt.value === targetProject)}
            onChange={handleProjectChange}
            options={projectOptions}
            styles={customSelectStyles}
            menuPortalTarget={document.body}
            placeholder="-- Select a Project --"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="importSprint">Target Sprint:</label>
           <Select
              id="importSprint"
              value={sprintNumberOptions.find(opt => opt.value === targetSprint)}
              onChange={handleSprintChange}
              options={sprintNumberOptions}
              isDisabled={isBacklog}
              styles={customSelectStyles}
              menuPortalTarget={document.body}
            />
        </div>
        <div className="form-group new-project-toggle">
          <input
            type="checkbox"
            id="importIsBacklog"
            checked={isBacklog}
            onChange={(e) => setIsBacklog(e.target.checked)}
          />
          <label htmlFor="importIsBacklog" className="checkbox-label optional-label">
            Assign to Backlog
          </label>
        </div>
        <div className="form-group">
            <label htmlFor="importRelease" className="optional-label">Assign to Release (Optional):</label>
            <Select
              id="importRelease"
              value={releaseOptions.find(opt => opt.value === targetReleaseId)}
              onChange={handleReleaseChange}
              options={releaseOptions}
              isDisabled={!targetProject || releases.length === 0}
              styles={customSelectStyles}
              menuPortalTarget={document.body}
              placeholder={!targetProject ? "-- Select a project first --" : (releases.length === 0 ? "-- No releases for this project --" : "-- Select a Release --")}
              isClearable
            />
        </div>
        <div className="modal-actions">
          <button onClick={handleImport} className="modal-button-save">Import</button>
          <button type="button" onClick={onClose} className="modal-button-cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ImportRequirementsModal;