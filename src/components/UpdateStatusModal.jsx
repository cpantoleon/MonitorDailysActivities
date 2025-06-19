import React, { useState, useEffect } from 'react';

const UpdateStatusModal = ({ isOpen, onClose, onSave, requirement, newStatus }) => {
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (isOpen) {
      setComment(''); // Reset comment when modal opens
    }
  }, [isOpen]);

  const handleSave = () => {
    onSave(comment);
  };

  if (!isOpen || !requirement) return null;

  return (
    <div className="add-new-modal-overlay">
      <div className="add-new-modal-content" style={{ maxWidth: '500px' }}>
        <h2>Update Status</h2>
        <p>
          You are moving requirement <strong>{requirement.requirementUserIdentifier}</strong> to the "<strong>{newStatus}</strong>" column.
        </p>
        <div className="form-group">
          <label htmlFor="updateStatusComment" className="optional-label">Add a comment (optional):</label>
          <textarea
            id="updateStatusComment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows="4"
            placeholder="Why is the status being updated?"
            autoFocus
          />
        </div>
        <div className="modal-actions">
          <button onClick={handleSave} className="modal-button-save">Confirm Update</button>
          <button type="button" onClick={onClose} className="modal-button-cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default UpdateStatusModal;