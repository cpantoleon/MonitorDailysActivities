import React, { useState } from 'react';
import Select from 'react-select';
import Tooltip from './Tooltip'; // Import the new reusable component

const ImportDefectsModal = ({ isOpen, onClose, onImport, projects }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetProject, setTargetProject] = useState('');
  const [error, setError] = useState('');

  const projectOptions = projects.map(p => ({ value: p, label: p }));

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
    onImport(selectedFile, targetProject);
  };

  const handleProjectChange = (selectedOption) => {
    setTargetProject(selectedOption ? selectedOption.value : '');
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
        <li>Only rows with the type 'Defect' in the 'T' column will be imported.</li>
        <li>The 'Summary' column is required and will become the defect's title.</li>
        <li>The 'Key' column (e.g., 'PROJ-123') is used to create a JIRA link and check for duplicates.</li>
        <li>If a defect with the same 'Key' already exists, it will be imported with a modified title (e.g., "Title (1)").</li>
        <li>Other columns are ignored.</li>
      </ul>
    </>
  );

  if (!isOpen) return null;

  return (
    <div className="add-new-modal-overlay">
      <div className="add-new-modal-content">
        <div className="modal-header-with-tooltip">
          <h2>Import Defects from Excel</h2>
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
        <div className="modal-actions">
          <button onClick={handleImport} className="modal-button-save">Import</button>
          <button type="button" onClick={onClose} className="modal-button-cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ImportDefectsModal;