import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import AppNavigationBar from './components/AppNavigationBar';
import ProjectSelector from './components/ProjectSelector';
import SprintSelector from './components/SprintSelector';
import KanbanBoard from './components/KanbanBoard';
import HistoryModal from './components/HistoryModal';
import AddNewRequirementModal from './components/AddNewRequirementModal';
import AddProjectModal from './components/AddProjectModal';
import EditRequirementModal from './components/EditRequirementModal';
import NotesPage from './pages/NotesPage';
import DefectsPage from './pages/DefectsPage';
import SprintAnalysisPage from './pages/SprintAnalysisPage';
import { getUniqueProjects, getSprintsForProject } from './utils/dataHelpers';
import ConfirmationModal from './components/ConfirmationModal';
import Toast from './components/Toast';
import SearchComponent from './components/SearchComponent';
import UpdateStatusModal from './components/UpdateStatusModal';

const API_BASE_URL = 'http://localhost:3001/api';

const SprintActivitiesPage = ({
  projects,
  selectedProject,
  onSelectProject,
  availableSprints,
  selectedSprint,
  onSelectSprint,
  requirementQuery,
  onQueryChange,
  onSearch,
  onClear,
  onSuggestionSelect,
  searchSuggestions,
  onOpenAddProjectModal,
  onOpenAddModal,
  onDeleteProjectRequest,
  isSearching,
  displayableRequirements,
  onShowHistory,
  onEditRequirement,
  onDeleteRequirement,
  onStatusUpdateRequest
}) => {
  return (
    <div className="main-content-area">
      <div className="selection-controls">
        <div className="selection-group-container">
          <ProjectSelector projects={projects} selectedProject={selectedProject} onSelectProject={onSelectProject} />
          <SprintSelector sprints={availableSprints} selectedSprint={selectedSprint} onSelectSprint={onSelectSprint} disabled={!selectedProject || projects.length === 0} />
        </div>
        <div className="page-actions-group">
           <SearchComponent
            query={requirementQuery}
            onQueryChange={onQueryChange}
            onSearch={onSearch}
            onClear={onClear}
            onSuggestionSelect={onSuggestionSelect}
            suggestions={searchSuggestions}
            placeholder="Search requirements..."
          />
          <button onClick={onOpenAddProjectModal} className="add-new-project-button">+ Add Project</button>
          <button onClick={onOpenAddModal} className="add-new-req-button">+ Add Requirement</button>
          <button onClick={onDeleteProjectRequest} className="delete-project-button" disabled={!selectedProject}>- Delete Project</button>
        </div>
      </div>
      {isSearching && displayableRequirements.length === 0 && (
        <div className="empty-column-message">No results found for your search.</div>
      )}
      <KanbanBoard
        requirements={displayableRequirements}
        onShowHistory={onShowHistory}
        onEditRequirement={onEditRequirement}
        onDeleteRequirement={onDeleteRequirement}
        isSearching={isSearching}
        onStatusUpdateRequest={onStatusUpdateRequest}
      />
    </div>
  );
};


function App() {
  const [allProcessedRequirements, setAllProcessedRequirements] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [availableSprints, setAvailableSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState('');
  const [displayableRequirements, setDisplayableRequirements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [requirementForHistory, setRequirementForHistory] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newReqFormState, setNewReqFormState] = useState({
    project: '', requirementName: '', status: 'To Do', sprint: '', comment: '', link: ''
  });

  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [toastInfo, setToastInfo] = useState({ message: null, type: 'success', key: null });
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState(null);
  const [isDeleteProjectConfirmModalOpen, setIsDeleteProjectConfirmModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const [isSearching, setIsSearching] = useState(false);
  const [requirementQuery, setRequirementQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [statusUpdateInfo, setStatusUpdateInfo] = useState({ requirement: null, newStatus: '' });

  const hasFetched = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectParam = params.get('project');
    const sprintParam = params.get('sprint');

    if (projectParam) {
      setSelectedProject(projectParam);
    }
    if (sprintParam) {
      setSelectedSprint(sprintParam);
    }
    if (projectParam || sprintParam) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, navigate]);

  const showMainMessage = useCallback((text, type = 'success') => {
    setToastInfo({ message: text, type: type, key: Date.now() });
  }, []);

  const handleDismissToast = useCallback(() => {
    setToastInfo({ message: null, type: 'success', key: null });
  }, []);

  const fetchRequirementsOnly = useCallback(async () => {
    try {
      const requirementsResponse = await fetch(`${API_BASE_URL}/requirements`);
      if (!requirementsResponse.ok) throw new Error(`Requirements fetch failed: ${requirementsResponse.statusText}`);
      const requirementsResult = await requirementsResponse.json();

      if (requirementsResult.data && Array.isArray(requirementsResult.data)) {
        const reqsWithDates = requirementsResult.data.map(group => ({
            ...group,
            project: group.project ? String(group.project).trim() : '',
            requirementUserIdentifier: group.requirementUserIdentifier ? String(group.requirementUserIdentifier).trim() : 'Unnamed Requirement',
            history: group.history.map((hist, index) => ({
                ...hist,
                date: new Date(hist.date),
                createdAt: hist.createdAt ? new Date(hist.createdAt) : new Date(hist.date),
                id: `${group.id}_hist_${hist.activityId || `idx_${index}`}`,
                activityId: hist.activityId
            })),
            currentStatusDetails: group.currentStatusDetails ? {
                ...group.currentStatusDetails,
                date: new Date(group.currentStatusDetails.date),
                createdAt: group.currentStatusDetails.createdAt ? new Date(group.currentStatusDetails.createdAt) : new Date(group.currentStatusDetails.date),
                activityId: group.currentStatusDetails.activityId
            } : { status: 'N/A', sprint: 'N/A', comment: '', link: '', date: new Date(), createdAt: new Date(), activityId: null }
        }));
        setAllProcessedRequirements(reqsWithDates);
        return reqsWithDates;
      } else {
        showMainMessage("Could not refresh requirements: data format unexpected.", "error");
      }
    } catch(err) {
      showMainMessage(`Error refreshing requirements: ${err.message}`, "error");
    }
    return [];
  }, [showMainMessage]);

  const fetchData = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const projectsResponse = await fetch(`${API_BASE_URL}/projects`);
      if (!projectsResponse.ok) throw new Error(`Project fetch failed: ${projectsResponse.statusText}`);
      const projectsResult = await projectsResponse.json();
      const officialProjects = projectsResult.data || [];
      
      const freshRequirements = await fetchRequirementsOnly();

      const projectsFromData = getUniqueProjects(freshRequirements);

      const combinedProjects = Array.from(new Set([...officialProjects, ...projectsFromData])).sort();
      setProjects(combinedProjects);

    } catch (err) { 
        setError(err.message || "Failed to fetch data."); 
        setAllProcessedRequirements([]); 
        setProjects([]);
    }
    finally { setIsLoading(false); }
  }, [fetchRequirementsOnly]);

  useEffect(() => {
    if (hasFetched.current) {
        return;
    }
    fetchData();
    hasFetched.current = true;
  }, [fetchData]);

  useEffect(() => {
    if (selectedProject && allProcessedRequirements.length > 0) {
      const sprints = getSprintsForProject(allProcessedRequirements, selectedProject);
      setAvailableSprints(sprints);
      if (selectedSprint && !sprints.includes(selectedSprint)) setSelectedSprint('');
      if (sprints.length === 0) setSelectedSprint('');
    } else { setAvailableSprints([]); setSelectedSprint(''); }
  }, [selectedProject, allProcessedRequirements, selectedSprint]);

  useEffect(() => {
    if (isSearching) return;
    if (selectedProject && selectedSprint && allProcessedRequirements.length > 0) {
      setDisplayableRequirements(allProcessedRequirements.filter(req => req.project === selectedProject && req.currentStatusDetails?.sprint === selectedSprint));
    } else { setDisplayableRequirements([]); }
  }, [selectedProject, selectedSprint, allProcessedRequirements, isSearching]);

  const handleShowHistory = useCallback((requirementGroup) => {
    setRequirementForHistory(requirementGroup); setIsHistoryModalOpen(true);
  }, []);
  const handleCloseHistoryModal = useCallback(() => {
    setIsHistoryModalOpen(false); setRequirementForHistory(null);
  }, []);

  const handleOpenEditModal = useCallback((requirement) => {
    setEditingRequirement(requirement);
    setIsEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingRequirement(null);
  }, []);

  const handleSaveRequirementEdit = useCallback(async (formData) => {
    if (!editingRequirement) return;

    const { id, project, requirementUserIdentifier, currentStatusDetails } = editingRequirement;
    const { name, comment, sprint, status, link } = formData;

    let somethingChanged = false;
    try {
      if (name.trim() !== requirementUserIdentifier) {
        somethingChanged = true;
        const renameResponse = await fetch(`${API_BASE_URL}/requirements/${id}/rename`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newRequirementName: name.trim() })
        });
        if (!renameResponse.ok) throw new Error('Failed to rename requirement.');
      }

      if (status !== currentStatusDetails.status || sprint !== currentStatusDetails.sprint) {
        somethingChanged = true;
        const activityPayload = {
          project: project,
          requirementName: name.trim(),
          status: status,
          sprint: sprint,
          comment: comment,
          link: link,
          statusDate: new Date().toISOString().split('T')[0],
          existingRequirementGroupId: id
        };
        const activityResponse = await fetch(`${API_BASE_URL}/activities`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(activityPayload)
        });
        if (!activityResponse.ok) throw new Error('Failed to update status/sprint.');
      
      } else if (comment !== currentStatusDetails.comment || link !== (currentStatusDetails.link || '')) {
        somethingChanged = true;
        const updatePayload = {};
        if (comment !== currentStatusDetails.comment) {
            updatePayload.comment = comment;
        }
        if (link !== (currentStatusDetails.link || '')) {
            updatePayload.link = link;
        }
        const updateResponse = await fetch(`${API_BASE_URL}/activities/${currentStatusDetails.activityId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });
        if (!updateResponse.ok) throw new Error('Failed to update comment/link.');
      }

      if (somethingChanged) {
        showMainMessage("Requirement updated successfully!", 'success');
        await fetchData();
      } else {
        showMainMessage("No changes were made.", 'success');
      }

    } catch (error) {
      showMainMessage(`Error: ${error.message}`, 'error');
    } finally {
      handleCloseEditModal();
    }
  }, [editingRequirement, fetchData, showMainMessage, handleCloseEditModal]);

  const handleSaveHistoryEntry = useCallback(async (requirementGroupId, activityDbId, newDate, newComment) => {
    if (!activityDbId) { showMainMessage("Error: Cannot update history. Missing activity DB ID.", 'error'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/activities/${activityDbId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment: newComment, statusDate: newDate.toISOString().split('T')[0] }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to save history"); }
      await fetchData(); showMainMessage("History updated!", 'success');
    } catch (e) { showMainMessage(`Error: ${e.message}`, 'error'); }
  }, [fetchData, showMainMessage]);

  const handleOpenAddModal = useCallback(() => {
    let initialProjectForModal = selectedProject || (projects.length > 0 ? projects[0] : '');
    setNewReqFormState({
        project: initialProjectForModal,
        requirementName: '', status: 'To Do', sprint: '', comment: '', link: ''
    });
    setIsAddModalOpen(true);
  }, [selectedProject, projects]);

  const handleCloseAddModal = useCallback(() => setIsAddModalOpen(false), []);
  const handleNewReqFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setNewReqFormState(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleAddNewRequirement = useCallback(async () => {
    const { project, requirementName, status, sprint, comment, link } = newReqFormState;
    if (!project.trim() || !requirementName.trim() || !status.trim() || !sprint.trim()) {
      showMainMessage("Project, Requirement Name, Status, and Sprint are mandatory.", 'error');
      return;
    }
    const payload = {
      project: project.trim(),
      requirementName: requirementName.trim(),
      status: status.trim(),
      sprint: sprint.trim(),
      comment: comment ? comment.trim() : null,
      link: link ? link.trim() : null,
      statusDate: new Date().toISOString().split('T')[0]
    };

    try {
      const res = await fetch(`${API_BASE_URL}/activities`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errText = await res.text();
        try { const errJson = JSON.parse(errText); throw new Error(errJson.error || "Failed to add requirement"); }
        catch (e) { throw new Error(`Failed to add requirement: ${errText}`); }
      }
      await fetchData();
      setSelectedProject(payload.project);
      setSelectedSprint(payload.sprint);
      handleCloseAddModal();
      showMainMessage("New requirement added!", 'success');
    } catch (e) {
      showMainMessage(`Error: ${e.message}`, 'error');
    }
  }, [newReqFormState, fetchData, showMainMessage, handleCloseAddModal]);

  const handleOpenAddProjectModal = useCallback(() => setIsAddProjectModalOpen(true), []);
  const handleCloseAddProjectModal = useCallback(() => setIsAddProjectModalOpen(false), []);

  const handleAddNewProject = useCallback(async (newProjectName) => {
    try {
        const response = await fetch(`${API_BASE_URL}/projects`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newProjectName }),
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Failed to add project.");
        }
        showMainMessage(`Project "${newProjectName}" added successfully.`, 'success');
        handleCloseAddProjectModal();
        await fetchData();
    } catch (error) {
        showMainMessage(`Error: ${error.message}`, 'error');
    }
  }, [fetchData, showMainMessage, handleCloseAddProjectModal]);

  const handleDeleteRequirementRequest = useCallback((requirementGroupId, project, requirementName) => {
    setRequirementToDelete({ id: requirementGroupId, name: requirementName, project: project });
    setIsDeleteConfirmModalOpen(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteConfirmModalOpen(false);
    setRequirementToDelete(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!requirementToDelete?.id) {
        showMainMessage("Error: Requirement Group ID for deletion is missing.", "error");
        setIsDeleteConfirmModalOpen(false); setRequirementToDelete(null); return;
    }
    const { id, name, project } = requirementToDelete;
    try {
      const response = await fetch(`${API_BASE_URL}/requirements/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || `Failed to delete requirement ${name}`);}
      showMainMessage(`Requirement '${name}' (Project: ${project}) deleted successfully.`, 'success');
      await fetchData();
    } catch (error) { showMainMessage(`Error: ${error.message}`, 'error');}
    finally {
        setIsDeleteConfirmModalOpen(false);
        setRequirementToDelete(null);
    }
  }, [requirementToDelete, fetchData, showMainMessage]);

  const handleDeleteProjectRequest = useCallback(() => {
    if (selectedProject) {
      setProjectToDelete(selectedProject);
      setIsDeleteProjectConfirmModalOpen(true);
    }
  }, [selectedProject]);

  const handleCancelProjectDelete = useCallback(() => {
    setIsDeleteProjectConfirmModalOpen(false);
    setProjectToDelete(null);
  }, []);

  const handleConfirmProjectDelete = useCallback(async () => {
    if (!projectToDelete) {
      showMainMessage("Error: No project selected for deletion.", "error");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(projectToDelete)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to delete project '${projectToDelete}'.`);
      }
      showMainMessage(`Project '${projectToDelete}' and all its data deleted successfully.`, 'success');
      setSelectedProject('');
      await fetchData();
    } catch (error) {
      showMainMessage(`Error: ${error.message}`, 'error');
    } finally {
      handleCancelProjectDelete();
    }
  }, [projectToDelete, fetchData, showMainMessage, handleCancelProjectDelete]);

  useEffect(() => {
    if (isHistoryModalOpen && requirementForHistory) {
      const updatedReq = allProcessedRequirements.find(rg => rg.id === requirementForHistory.id);
      if (updatedReq) {
        if (JSON.stringify(updatedReq.history) !== JSON.stringify(requirementForHistory.history)) {
          setRequirementForHistory({...updatedReq});
        }
      } else {
        setIsHistoryModalOpen(false);
        setRequirementForHistory(null);
      }
    }
  }, [allProcessedRequirements, isHistoryModalOpen, requirementForHistory]);

  const handleRequirementSearch = (query) => {
    const finalQuery = query || requirementQuery;
    if (!finalQuery) {
      handleClearRequirementSearch();
      return;
    }
    setIsSearching(true);
    setSearchSuggestions([]);
    const lowerCaseQuery = finalQuery.toLowerCase();
    const results = allProcessedRequirements.filter(req =>
      req.requirementUserIdentifier.toLowerCase().includes(lowerCaseQuery)
    );
    setDisplayableRequirements(results);

    if (results.length > 0) {
      const uniqueProjects = [...new Set(results.map(r => r.project))];
      if (uniqueProjects.length === 1) {
        setSelectedProject(uniqueProjects[0]);
        const uniqueSprints = [...new Set(results.map(r => r.currentStatusDetails.sprint))];
        if (uniqueSprints.length === 1) {
          setSelectedSprint(uniqueSprints[0]);
        } else {
          setSelectedSprint('');
        }
      } else {
        setSelectedProject('');
        setSelectedSprint('');
      }
    } else {
      setSelectedProject('');
      setSelectedSprint('');
    }
  };

  const handleClearRequirementSearch = () => {
    setIsSearching(false);
    setRequirementQuery('');
    setSearchSuggestions([]);
    setSelectedProject('');
    setSelectedSprint('');
    setDisplayableRequirements([]);
  };

  const handleRequirementQueryChange = (query) => {
    setRequirementQuery(query);
    if (query.length < 3) {
      setSearchSuggestions([]);
      return;
    }
    const lowerCaseQuery = query.toLowerCase();
    
    let sourceData = allProcessedRequirements;
    if (selectedProject) {
      sourceData = sourceData.filter(req => req.project === selectedProject);
      if (selectedSprint) {
        sourceData = sourceData.filter(req => req.currentStatusDetails.sprint === selectedSprint);
      }
    }

    const suggestions = sourceData
      .filter(req => req.requirementUserIdentifier.toLowerCase().includes(lowerCaseQuery))
      .map(req => ({
        id: req.id,
        name: req.requirementUserIdentifier,
        context: `${req.project} / ${req.currentStatusDetails.sprint}`
      }))
      .slice(0, 10);
    setSearchSuggestions(suggestions);
  };

  const handleRequirementSuggestionSelect = (suggestion) => {
    setRequirementQuery(suggestion.name);
    setSearchSuggestions([]);

    const selectedReq = allProcessedRequirements.find(req => req.id === suggestion.id);
    
    if (selectedReq) {
      setDisplayableRequirements([selectedReq]);
      setSelectedProject(selectedReq.project);
      setSelectedSprint(selectedReq.currentStatusDetails.sprint);
      setIsSearching(true);
    } else {
      handleRequirementSearch(suggestion.name);
    }
  };

  const handleStatusUpdateRequest = (requirement, newStatus) => {
    setStatusUpdateInfo({ requirement, newStatus });
    setIsUpdateStatusModalOpen(true);
  };

  const handleCloseUpdateStatusModal = () => {
    setIsUpdateStatusModalOpen(false);
    setStatusUpdateInfo({ requirement: null, newStatus: '' });
  };

  const handleConfirmStatusUpdate = async (comment) => {
    const { requirement, newStatus } = statusUpdateInfo;
    if (!requirement) return;

    const payload = {
      project: requirement.project,
      requirementName: requirement.requirementUserIdentifier,
      status: newStatus,
      sprint: requirement.currentStatusDetails.sprint,
      comment: comment,
      link: requirement.currentStatusDetails.link,
      statusDate: new Date().toISOString().split('T')[0],
      existingRequirementGroupId: requirement.id
    };

    try {
      const response = await fetch(`${API_BASE_URL}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error('Failed to update status.');
      }
      showMainMessage('Status updated successfully!', 'success');
      await fetchData();
    } catch (error) {
      showMainMessage(`Error: ${error.message}`, 'error');
    } finally {
      handleCloseUpdateStatusModal();
    }
  };

  if (isLoading) { return (<div className="app-container"><AppNavigationBar /><div className="loading-message">Loading data...</div></div>); }
  if (error && !isLoading) { return (<div className="app-container"><AppNavigationBar /><div className="error-message-global full-page-error">{error} <button onClick={fetchData}>Try Again</button></div></div>); }

  return (
    <div className="app-container">
      <AppNavigationBar />
      <Toast key={toastInfo.key} message={toastInfo.message} type={toastInfo.type} onDismiss={handleDismissToast} />
      <Routes>
        <Route 
          path="/" 
          element={
            <SprintActivitiesPage 
              projects={projects}
              selectedProject={selectedProject}
              onSelectProject={setSelectedProject}
              availableSprints={availableSprints}
              selectedSprint={selectedSprint}
              onSelectSprint={setSelectedSprint}
              requirementQuery={requirementQuery}
              onQueryChange={handleRequirementQueryChange}
              onSearch={handleRequirementSearch}
              onClear={handleClearRequirementSearch}
              onSuggestionSelect={handleRequirementSuggestionSelect}
              searchSuggestions={searchSuggestions}
              onOpenAddProjectModal={handleOpenAddProjectModal}
              onOpenAddModal={handleOpenAddModal}
              onDeleteProjectRequest={handleDeleteProjectRequest}
              isSearching={isSearching}
              displayableRequirements={displayableRequirements}
              onShowHistory={handleShowHistory}
              onEditRequirement={handleOpenEditModal}
              onDeleteRequirement={handleDeleteRequirementRequest}
              onStatusUpdateRequest={handleStatusUpdateRequest}
            />
          } 
        />
        <Route path="/defects" element={<DefectsPage projects={projects} allRequirements={allProcessedRequirements} showMessage={showMainMessage} onDefectUpdate={fetchRequirementsOnly} />} />
        <Route path="/sprint-analysis" element={<SprintAnalysisPage projects={projects} showMessage={showMainMessage} />} />
        <Route path="/notes" element={<NotesPage projects={projects} apiBaseUrl={API_BASE_URL} showMessage={showMainMessage} />} />
      </Routes>
      <HistoryModal requirement={requirementForHistory} isOpen={isHistoryModalOpen} onClose={handleCloseHistoryModal} onSaveHistoryEntry={handleSaveHistoryEntry} />
      <AddNewRequirementModal isOpen={isAddModalOpen} onClose={handleCloseAddModal} formData={newReqFormState} onFormChange={handleNewReqFormChange} onSubmit={handleAddNewRequirement} projects={projects} />
      <AddProjectModal
        isOpen={isAddProjectModalOpen}
        onClose={handleCloseAddProjectModal}
        onAddProject={handleAddNewProject}
      />
      <EditRequirementModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveRequirementEdit}
        requirement={editingRequirement}
      />
      <UpdateStatusModal
        isOpen={isUpdateStatusModalOpen}
        onClose={handleCloseUpdateStatusModal}
        onSave={handleConfirmStatusUpdate}
        requirement={statusUpdateInfo.requirement}
        newStatus={statusUpdateInfo.newStatus}
      />
      <ConfirmationModal
        isOpen={isDeleteConfirmModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirm Requirement Deletion"
        message={`Are you sure you want to delete requirement "${requirementToDelete?.name}" (Project: ${requirementToDelete?.project}) and all its history? This action cannot be undone.`}
      />
      <ConfirmationModal
        isOpen={isDeleteProjectConfirmModalOpen}
        onClose={handleCancelProjectDelete}
        onConfirm={handleConfirmProjectDelete}
        title="Confirm Project Deletion"
        message={`Are you sure you want to delete the project "${projectToDelete}"? This will also delete ALL associated requirements, notes, defects, and retrospective items permanently. This action cannot be undone.`}
      />
    </div>
  );
}

export default App;