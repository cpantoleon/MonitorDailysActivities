import React, { useState, useEffect, useMemo } from 'react';
import useClickOutside from '../hooks/useClickOutside';
import ConfirmationModal from './ConfirmationModal';

const UpdateStatusModal = ({ isOpen, onClose, onSave, requirement, newStatus }) => {
  const [comment, setComment] = useState('');
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setComment('');
    }
  }, [isOpen]);

  const hasUnsavedChanges = useMemo(() => comment.trim() !== '', [comment]);

  const handleCloseRequest = () => {
    if (hasUnsavedChanges) {
      setIsCloseConfirmOpen(true);
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    onSave(comment);
  };

  const modalRef = useClickOutside(handleCloseRequest);

  if (!isOpen || !requirement) return null;

  return (
    <>
      <div className="add-new-modal-overlay">
        <div ref={modalRef} className="add-new-modal-content" style={{ maxWidth: '500px' }}>
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
            <button type="button" onClick={handleCloseRequest} className="modal-button-cancel">Cancel</button>
          </div>
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
        message="You have an unsaved comment. Are you sure you want to close?"
      />
    </>
  );
};

export default UpdateStatusModal;