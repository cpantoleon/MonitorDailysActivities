import React from 'react';

const ProjectSelector = ({ projects, selectedProject, onSelectProject }) => {
  return (
    <div className="selection-group">
      <span className="dropdown-label">Project Selection</span>
      <select
        value={selectedProject}
        onChange={(e) => onSelectProject(e.target.value)}
        className="main-label"
        disabled={projects.length === 0}
      >
        <option value="">-- Select Project --</option>
        {projects.map(project => (
          <option key={project} value={project}>{project}</option>
        ))}
      </select>
    </div>
  );
};

export default ProjectSelector;