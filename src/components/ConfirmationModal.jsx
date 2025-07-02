import React from 'react';
import useClickOutside from '../hooks/useClickOutside';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  const modalRef = useClickOutside(onClose);

  return (
    <div className="confirmation-modal-overlay">
      <div ref={modalRef} className="confirmation-modal-content">
        <h3>{title || 'Confirm Action'}</h3>
        <p>{message || 'Are you sure?'}</p>
        <div className="modal-actions">
          <button onClick={onConfirm} className="modal-button-confirm">Yes</button>
          <button onClick={onClose} className="modal-button-cancel">No</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;