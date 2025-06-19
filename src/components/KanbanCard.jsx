import React from 'react';
import { useNavigate } from 'react-router-dom';

const KanbanCard = React.memo(({
  requirement,
  onShowHistory,
  onEditRequirement,
  onDeleteRequirement,
  onDragStart
}) => {
  const { comment, link } = requirement.currentStatusDetails;
  const navigate = useNavigate();

  const handleDefectClick = (project) => {
    navigate(`/defects?project=${encodeURIComponent(project)}`);
  };

  const handleDragStart = (e, req) => {
    onDragStart(e, req);
    
    // Save a reference to the element, as 'e.currentTarget' will be nullified in the timeout.
    const draggedElement = e.currentTarget;
    
    // Use a timeout to allow the browser to create its drag preview
    // before we apply the 'dragging' style to the original element.
    setTimeout(() => {
      draggedElement.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e) => {
    // Clean up by removing the class when the drag operation ends.
    e.currentTarget.classList.remove('dragging');
  };

  return (
    <div 
      className="kanban-card"
      draggable="true"
      onDragStart={(e) => handleDragStart(e, requirement)}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-card-main-content">
        <strong>{requirement.requirementUserIdentifier}</strong>

        <div className="kanban-card-details">
          {comment && (
            <p className="card-detail-item">
              <span className="detail-label">Comment:</span>
              <span className="detail-value">{comment}</span>
            </p>
          )}

          {link && (
            <p className="card-detail-item">
              <span className="detail-label">Link:</span>
              <a href={link} target="_blank" rel="noopener noreferrer" className="detail-value">
                {link}
              </a>
            </p>
          )}

          {requirement.linkedDefects && requirement.linkedDefects.length > 0 && (
            <div className="card-detail-item">
              <span className="detail-label">Linked Defects:</span>
              <div className="linked-items-container">
                {requirement.linkedDefects.map(defect => (
                  <button 
                    key={defect.id} 
                    className="linked-item-tag requirement"
                    onClick={() => handleDefectClick(requirement.project)}
                    title={`Go to defects for project ${requirement.project}`}
                  >
                    {defect.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!comment && !link && (!requirement.linkedDefects || requirement.linkedDefects.length === 0) && (
            <p className="card-detail-item-empty">No additional details.</p>
          )}
        </div>
      </div>

      <div className="kanban-card-buttons-container">
        <button 
          onClick={() => onEditRequirement(requirement)} 
          className="edit-card-button"
        >
          Edit
        </button>
        
        <button 
          onClick={() => onShowHistory(requirement)} 
          className="history-card-button"
        >
          History
        </button>

        <button
          onClick={() => onDeleteRequirement(requirement.id, requirement.project, requirement.requirementUserIdentifier)}
          className="delete-card-button"
          title={`Delete ${requirement.requirementUserIdentifier}`}
        >
          Delete
        </button>
      </div>
    </div>
  );
});

export default KanbanCard;