import React from 'react';
import useClickOutside from '../hooks/useClickOutside';

const DefectHistoryModal = ({ isOpen, onClose, defect, history }) => {
  const modalRef = useClickOutside(onClose);

  if (!isOpen || !defect) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const renderChangeSummary = (summaryString) => {
    if (!summaryString) return <span>-</span>;
    try {
      const summary = JSON.parse(summaryString);
      return (
        <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
          {Object.entries(summary).map(([field, values]) => (
            <li key={field} style={{ marginBottom: '3px' }}>
              <strong>{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> 
              <span style={{ color: '#777', fontStyle: 'italic' }}>"{values.old || '-'}"</span> to <span style={{ fontWeight: '500' }}>"{values.new || '-'}"</span>
            </li>
          ))}
        </ul>
      );
    } catch (e) {
      if (summaryString === "Defect created." || (typeof summaryString === 'string' && summaryString.startsWith('{'))) {
         try {
            const summary = JSON.parse(summaryString);
             return (
                <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
                {Object.entries(summary).map(([field, values]) => (
                    <li key={field} style={{ marginBottom: '3px' }}>
                    <strong>{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> 
                    <span style={{ fontWeight: '500' }}>"{values.new || '-'}"</span>
                    </li>
                ))}
                </ul>
            );
         } catch (jsonErr) {
            return <span>{summaryString}</span>;
         }
      }
      return <span>{summaryString}</span>;
    }
  };

  return (
    <div className="history-modal-overlay">
      <div ref={modalRef} className="history-modal-content" style={{maxWidth: '800px'}}>
        <h2>History for Defect: {defect.title}</h2>
        <button onClick={onClose} className="history-modal-close-button">Close</button>
        {history.length === 0 ? (
          <p>No history recorded for this defect yet.</p>
        ) : (
          <table className="history-modal-table">
            <thead>
              <tr>
                <th>Changed At</th>
                <th>Changes Summary</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {history.slice().sort((a,b) => new Date(b.changed_at) - new Date(a.changed_at)).map(entry => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.changed_at)}</td>
                  <td>{renderChangeSummary(entry.changes_summary)}</td>
                  <td>{entry.comment || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DefectHistoryModal;