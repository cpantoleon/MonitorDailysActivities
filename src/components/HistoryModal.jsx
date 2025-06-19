import React, { useState, useEffect, useRef } from 'react';

const formatDateForInputInternal = (dateObj) => {
    if (!dateObj) return '';
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
};

const formatDateForDisplayInternal = (dateObj) => {
    if (!dateObj) return 'N/A';
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString();
};

const HistoryModal = ({ requirement, isOpen, onClose, onSaveHistoryEntry }) => {
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editFormDate, setEditFormDate] = useState('');
  const [editFormComment, setEditFormComment] = useState('');
  const commentInputRef = useRef(null);
  const [modalForRequirementId, setModalForRequirementId] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setEditingEntryId(null); setEditFormDate(''); setEditFormComment('');
      setModalForRequirementId(null);
    } else if (requirement && (requirement.id !== modalForRequirementId || !modalForRequirementId)) {
      setEditingEntryId(null); setEditFormDate(''); setEditFormComment('');
      setModalForRequirementId(requirement.id);
    }
  }, [isOpen, requirement, modalForRequirementId]);

  useEffect(() => {
    if (editingEntryId && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [editingEntryId]);

  if (!isOpen || !requirement || !requirement.history) {
    return null;
  }

  const handleStartEdit = (historyEntry) => {
    setEditingEntryId(historyEntry.id);
    setEditFormDate(formatDateForInputInternal(historyEntry.date));
    setEditFormComment(historyEntry.comment || '');
  };

  const handleSaveEdit = (originalHistoryEntry) => {
    if (!editingEntryId || editingEntryId !== originalHistoryEntry.id) return;
    if (!editFormDate) { alert("Date cannot be empty."); return; }
    const newDate = new Date(editFormDate + 'T00:00:00Z');
    if (isNaN(newDate.getTime())) { alert("Invalid date entered."); return; }

    onSaveHistoryEntry(requirement.id, originalHistoryEntry.activityId, newDate, editFormComment);
    setEditingEntryId(null);
  };

  const handleCancelEdit = () => { setEditingEntryId(null); };

  const displayHistory = requirement.history.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="history-modal-overlay">
      <div className="history-modal-content">
        <h2>History for: {requirement.requirementUserIdentifier}</h2>
        <button onClick={onClose} className="history-modal-close-button">Close</button>
        <table className="history-modal-table">
          <thead>
            <tr><th>Status</th><th>Date</th><th>Sprint</th><th>Comment</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {displayHistory.map((entry) => {
              const isEditingThisRow = editingEntryId === entry.id;
              return (
                <tr key={entry.id}><td>{entry.status}</td><td>
                    {isEditingThisRow ? (
                      <input type="date" value={editFormDate} onChange={e => setEditFormDate(e.target.value)} />
                    ) : ( formatDateForDisplayInternal(entry.date) )}
                  </td><td>{entry.sprint || 'N/A'}</td><td>
                    {isEditingThisRow ? (
                      <input ref={commentInputRef} type="text" value={editFormComment} onChange={e => setEditFormComment(e.target.value)} placeholder="Enter comment" />
                    ) : ( entry.comment || 'N/A' )}
                  </td><td>
                    {isEditingThisRow ? (
                      <><button onClick={() => handleSaveEdit(entry)}>Save</button><button onClick={handleCancelEdit}>Cancel</button></>
                    ) : ( entry.activityId ? <button onClick={() => handleStartEdit(entry)}>Edit</button> : null )}
                  </td></tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryModal;