import React, { useState, useRef } from 'react';
import KanbanCard from './KanbanCard';

const KanbanColumn = ({
  title,
  requirements,
  onShowHistory,
  onEditRequirement,
  onDeleteRequirement,
  onDragStart,
  onDrop
}) => {
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) {
      setIsDraggedOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDraggedOver(false);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault(); // This is crucial to allow dropping
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggedOver(false);
    dragCounter.current = 0;
    // THIS LINE WAS MISSING. It calls the function passed down from KanbanBoard.
    onDrop(e, title);
  };

  return (
    <div 
      className={`kanban-column ${isDraggedOver ? 'drag-over' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="column-title-section">
        <h3 className="column-title">{title}</h3>
      </div>
      <div className="cards-container">
        {requirements.map(req => (
          <KanbanCard
            key={req.id}
            requirement={req}
            onShowHistory={onShowHistory}
            onEditRequirement={onEditRequirement}
            onDeleteRequirement={onDeleteRequirement}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;