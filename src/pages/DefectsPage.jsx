import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProjectSelector from '../components/ProjectSelector';
import DefectColumn from '../components/DefectColumn';
import DefectModal from '../components/DefectModal';
import ConfirmationModal from '../components/ConfirmationModal';
import DefectHistoryModal from '../components/DefectHistoryModal';
import SearchComponent from '../components/SearchComponent';
import UpdateStatusModal from '../components/UpdateStatusModal';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, Title, BarElement, CategoryScale, LinearScale);

const API_BASE_URL = '/api';
const DEFECT_STATUS_COLUMNS = [
  { title: 'Under Developer', status: 'Under Developer' },
  { title: 'To Be Tested', status: 'To Be Tested' },
  { title: 'Done', status: 'Done' },
];

const DefectsPage = ({ projects, allRequirements, showMessage, onDefectUpdate }) => {
  const [selectedProject, setSelectedProject] = useState('');
  const [allDefects, setAllDefects] = useState([]);
  const [activeDefects, setActiveDefects] = useState([]);
  const [closedDefects, setClosedDefects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDefect, setEditingDefect] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [defectForHistory, setDefectForHistory] = useState(null);
  const [defectHistory, setDefectHistory] = useState([]);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [defectToDelete, setDefectToDelete] = useState(null);
  const [showAreaChart, setShowAreaChart] = useState(false);
  const [areaChartData, setAreaChartData] = useState(null);
  const [returnToDevChartData, setReturnToDevChartData] = useState(null);
  const [showClosedView, setShowClosedView] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [defectQuery, setDefectQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [statusUpdateInfo, setStatusUpdateInfo] = useState({ defect: null, newStatus: '' });

  const navigate = useNavigate();
  const location = useLocation();
  
  const hasFetched = useRef(false);

  const fetchAllDefects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/defects/all`);
      if (!response.ok) throw new Error('Failed to fetch all defects');
      const result = await response.json();
      setAllDefects(result.data || []);
    } catch (error) {
      showMessage(`Error loading defect list: ${error.message}`, 'error');
      setAllDefects([]);
    } finally {
      setIsLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    if (!hasFetched.current) {
      fetchAllDefects();
      hasFetched.current = true;
    }
  }, [fetchAllDefects]);

  useEffect(() => {
    if (selectedProject) {
      const projectDefects = allDefects.filter(d => d.project === selectedProject);
      setActiveDefects(projectDefects.filter(d => d.status !== 'Closed'));
      setClosedDefects(projectDefects.filter(d => d.status === 'Closed'));
    } else {
      setActiveDefects([]);
      setClosedDefects([]);
    }
  }, [allDefects, selectedProject]);


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectParam = params.get('project');
    if (projectParam && projects.includes(projectParam)) {
        setSelectedProject(projectParam);
        navigate('/defects', { replace: true });
    }
  }, [location.search, navigate, projects]);

  useEffect(() => {
    const defectsForChart = showClosedView ? closedDefects : activeDefects;

    if (defectsForChart.length > 0) {
      const areaCounts = defectsForChart.reduce((acc, defect) => {
        acc[defect.area] = (acc[defect.area] || 0) + 1;
        return acc;
      }, {});
      setAreaChartData({
        labels: Object.keys(areaCounts),
        datasets: [{
          label: '# of Defects', data: Object.values(areaCounts),
          backgroundColor: ['rgba(255, 99, 132, 0.7)','rgba(54, 162, 235, 0.7)','rgba(255, 206, 86, 0.7)','rgba(75, 192, 192, 0.7)','rgba(153, 102, 255, 0.7)','rgba(255, 159, 64, 0.7)','rgba(199, 199, 199, 0.7)','rgba(83, 102, 255, 0.7)','rgba(102, 255, 83, 0.7)','rgba(255, 83, 102, 0.7)'],
          borderColor: ['rgba(255,99,132,1)','rgba(54,162,235,1)','rgba(255,206,86,1)','rgba(75,192,192,1)','rgba(153,102,255,1)','rgba(255,159,64,1)','rgba(199,199,199,1)','rgba(83,102,255,1)','rgba(102,255,83,1)','rgba(255,83,102,1)'],
          borderWidth: 1,
        }],
      });
    } else {
      setAreaChartData(null);
    }
  }, [activeDefects, closedDefects, showClosedView]);

  useEffect(() => {
    if (!selectedProject) {
      setReturnToDevChartData(null);
      return;
    }

    const fetchReturnCounts = async () => {
      try {
        const statusType = showClosedView ? 'closed' : 'active';
        const response = await fetch(`${API_BASE_URL}/defects/${selectedProject}/return-counts?statusType=${statusType}`);
        if (!response.ok) throw new Error('Failed to fetch return to developer counts');
        const result = await response.json();
        
        if (result.data && result.data.length > 0) {
          const labels = result.data.map(d => d.title);
          const data = result.data.map(d => d.return_count);

          setReturnToDevChartData({
            labels,
            datasets: [{
              label: 'Times Returned to Developer',
              data,
              backgroundColor: 'rgba(255, 159, 64, 0.7)',
              borderColor: 'rgba(255, 159, 64, 1)',
              borderWidth: 1,
            }]
          });
        } else {
          setReturnToDevChartData(null);
        }
      } catch (error) {
        showMessage(`Could not load return counts chart: ${error.message}`, 'error');
        setReturnToDevChartData(null);
      }
    };

    fetchReturnCounts();
  }, [selectedProject, showMessage, showClosedView]);

  useEffect(() => {
    if (showAreaChart && !areaChartData && !returnToDevChartData) {
      setShowAreaChart(false);
    }
  }, [areaChartData, returnToDevChartData, showAreaChart]);

  const handleOpenModal = (defect = null) => {
    setEditingDefect(defect); setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false); setEditingDefect(null);
  };

  const handleSubmitDefect = async (formData) => {
    const projectForSubmit = formData.project || selectedProject;
    if (!projectForSubmit) {
        showMessage("Please select a project.", "error"); return;
    }
    const payload = { ...formData, project: projectForSubmit };
    const isEditing = !!editingDefect;
    const url = isEditing ? `${API_BASE_URL}/defects/${editingDefect.id}` : `${API_BASE_URL}/defects`;
    const method = isEditing ? 'PUT' : 'POST';
    
    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'create'} defect`);
      
      showMessage(`Defect ${isEditing ? 'updated' : 'created'} successfully!`, 'success');
      await fetchAllDefects();
      if (onDefectUpdate) onDefectUpdate();
      handleCloseModal();
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    }
  };

  const handleDeleteRequest = (defect) => {
    setDefectToDelete(defect);
    setIsDeleteConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!defectToDelete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/defects/${defectToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete defect');
      }
      showMessage('Defect deleted successfully!', 'success');
      await fetchAllDefects();
      if (onDefectUpdate) onDefectUpdate();
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setIsDeleteConfirmModalOpen(false);
      setDefectToDelete(null);
    }
  };

  const handleShowHistory = async (defect) => {
    setDefectForHistory(defect); setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/defects/${defect.id}/history`);
      if (!response.ok) throw new Error("Failed to fetch defect history.");
      const result = await response.json();
      setDefectHistory(result.data || []);
      setIsHistoryModalOpen(true);
    } catch (error) { showMessage(`Error: ${error.message}`, 'error'); }
    finally { setIsLoading(false); }
  };

  const handleNavigateToRequirement = useCallback((project, sprint) => {
    navigate(`/?project=${encodeURIComponent(project)}&sprint=${encodeURIComponent(sprint)}`);
  }, [navigate]);

  const handleDefectSearch = (query) => {
    const finalQuery = query || defectQuery;
    if (!finalQuery) {
      handleClearDefectSearch();
      return;
    }
    setIsSearching(true);
    setSearchSuggestions([]);
    const lowerCaseQuery = finalQuery.toLowerCase();
    
    const sourceData = allDefects.filter(defect => 
      showClosedView ? defect.status === 'Closed' : defect.status !== 'Closed'
    );

    const results = sourceData.filter(defect =>
      defect.title.toLowerCase().includes(lowerCaseQuery)
    );
    setSearchResults(results);

    if (results.length > 0) {
      const uniqueProjects = [...new Set(results.map(d => d.project))];
      if (uniqueProjects.length === 1) {
        setSelectedProject(uniqueProjects[0]);
      } else {
        setSelectedProject('');
      }
    } else {
      setSelectedProject('');
    }
  };

  const handleClearDefectSearch = () => {
    setIsSearching(false);
    setDefectQuery('');
    setSearchResults([]);
    setSearchSuggestions([]);
    setSelectedProject('');
  };

  const handleDefectQueryChange = (query) => {
    setDefectQuery(query);
    if (query.length < 3) {
      setSearchSuggestions([]);
      return;
    }
    const lowerCaseQuery = query.toLowerCase();

    let sourceData = allDefects;
    if (selectedProject) {
      sourceData = sourceData.filter(defect => defect.project === selectedProject);
    }
    
    sourceData = sourceData.filter(defect => 
      showClosedView ? defect.status === 'Closed' : defect.status !== 'Closed'
    );

    const suggestions = sourceData
      .filter(defect => defect.title.toLowerCase().includes(lowerCaseQuery))
      .map(defect => ({
        id: defect.id,
        name: defect.title,
        context: defect.project
      }))
      .slice(0, 10);
    setSearchSuggestions(suggestions);
  };

  const handleDefectSuggestionSelect = (suggestion) => {
    setDefectQuery(suggestion.name);
    setSearchSuggestions([]);

    const selectedDefect = allDefects.find(d => d.id === suggestion.id);
    if (selectedDefect) {
      setSearchResults([selectedDefect]);
      setSelectedProject(selectedDefect.project);
      setIsSearching(true);
    } else {
      handleDefectSearch(suggestion.name);
    }
  };

  const handleStatusUpdateRequest = (defect, newStatus) => {
    setStatusUpdateInfo({ defect, newStatus });
    setIsUpdateStatusModalOpen(true);
  };

  const handleCloseUpdateStatusModal = () => {
    setIsUpdateStatusModalOpen(false);
    setStatusUpdateInfo({ defect: null, newStatus: '' });
  };

  const handleConfirmDefectStatusUpdate = async (comment) => {
    const { defect, newStatus } = statusUpdateInfo;
    if (!defect) return;
    
    const payload = { ...defect, status: newStatus, comment };

    try {
      const response = await fetch(`${API_BASE_URL}/defects/${defect.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error('Failed to update defect status.');
      }
      showMessage('Defect status updated successfully!', 'success');
      await fetchAllDefects();
      if (onDefectUpdate) onDefectUpdate();
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      handleCloseUpdateStatusModal();
    }
  };

  const handleDragStart = (e, defect) => {
    e.dataTransfer.setData("defectId", defect.id);
  };

  const handleDrop = (e, targetStatus) => {
    const defectId = e.dataTransfer.getData("defectId");
    const sourceData = isSearching ? searchResults : activeDefects;
    const draggedDefect = sourceData.find(d => d.id.toString() === defectId);
    
    if (draggedDefect && draggedDefect.status !== targetStatus) {
      handleStatusUpdateRequest(draggedDefect, targetStatus);
    }
  };

  const pieChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 20, padding: 15 } },
      title: { 
        display: true, 
        text: `${showClosedView ? 'Closed' : 'Active'} Defect Distribution by Area for ${selectedProject || 'Project'}`, 
        font: { size: 14 } 
      },
      tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed} (${((c.parsed / c.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)` } }
    },
  };

  const returnToDevChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Defect "Back to Developer" Count for ${selectedProject || 'Project'}`,
        font: { size: 14 }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  const renderBoard = (defectsToDisplay) => {
    if (showClosedView) {
      return (
        <div className="defects-board-container">
          <DefectColumn title="Closed" defects={defectsToDisplay} onEditDefect={handleOpenModal} onShowHistory={handleShowHistory} onDeleteRequest={handleDeleteRequest} onNavigate={handleNavigateToRequirement} />
        </div>
      );
    }
    return (
      <div className="defects-board-container">
        {DEFECT_STATUS_COLUMNS.map(column => (
          <DefectColumn 
            key={column.status} 
            title={column.title} 
            defects={defectsToDisplay.filter(d => d.status === column.status)} 
            onEditDefect={handleOpenModal} 
            onShowHistory={handleShowHistory} 
            onDeleteRequest={handleDeleteRequest} 
            onNavigate={handleNavigateToRequirement}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}
      </div>
    );
  };

  const defectsForNormalView = showClosedView ? closedDefects : activeDefects;

  return (
    <div className="main-content-area">
      <style>{`
        .defects-controls .selection-group-container {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .defect-charts-wrapper {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
          margin-bottom: 20px;
        }
        .defect-charts-wrapper .defect-chart-container {
          flex: 1 1 45%;
          min-width: 400px;
          max-width: 600px;
          height: 320px;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #fff;
        }
      `}</style>
      <h2>Defect Tracking</h2>
      <div className="defects-controls">
        <div className="selection-group-container">
            <ProjectSelector projects={projects || []} selectedProject={selectedProject} onSelectProject={setSelectedProject} />
            <div className="selection-group">
                <span className="dropdown-label" style={{ visibility: 'hidden' }}>Search</span>
                <SearchComponent
                  query={defectQuery}
                  onQueryChange={handleDefectQueryChange}
                  onSearch={handleDefectSearch}
                  onClear={handleClearDefectSearch}
                  onSuggestionSelect={handleDefectSuggestionSelect}
                  suggestions={searchSuggestions}
                  placeholder="Search defects by title..."
                />
            </div>
        </div>
        <div className="defects-actions-group">
            <button onClick={() => setShowAreaChart(p => !p)} className="defect-action-button" disabled={!selectedProject || (!areaChartData && !returnToDevChartData)}>
                {showAreaChart ? 'Hide' : 'Show'} Charts
            </button>
            <button onClick={() => setShowClosedView(p => !p)} className="defect-action-button" disabled={isLoading || allDefects.filter(d => d.status === 'Closed').length === 0} style={{backgroundColor: '#E0D3B6', borderColor: '#C8BBA2'}}>
                {showClosedView ? 'Show Active Defects' : 'Show Closed Defects'}
            </button>
            <button onClick={() => handleOpenModal()} className="add-defect-button" disabled={!projects || projects.length === 0}>
                + Add Defect
            </button>
        </div>
      </div>

      {isLoading && <p className="loading-message-defects">Loading defects...</p>}
      
      {!isLoading && !isSearching && !selectedProject && (
          <p className="select-project-prompt-defects">Please select a project to view defects, or use the search bar for all projects.</p>
      )}

      {showAreaChart && selectedProject && (
        <div className="defect-charts-wrapper">
          {areaChartData && (
            <div className="defect-chart-container">
              <Pie data={areaChartData} options={pieChartOptions} />
            </div>
          )}
          {returnToDevChartData && (
            <div className="defect-chart-container">
              <Bar data={returnToDevChartData} options={returnToDevChartOptions} />
            </div>
          )}
          {!areaChartData && !returnToDevChartData && !isLoading && (
            <div className="defect-chart-container" style={{ flexBasis: '100%', height: 'auto' }}>
              <p>No chart data available for the selected project.</p>
            </div>
          )}
        </div>
      )}

      {!isLoading && (
        isSearching 
          ? (searchResults.length > 0 ? renderBoard(searchResults) : <div className="empty-column-message">No results found for your search.</div>)
          : (selectedProject ? renderBoard(defectsForNormalView) : null)
      )}

      <UpdateStatusModal
        isOpen={isUpdateStatusModalOpen}
        onClose={handleCloseUpdateStatusModal}
        onSave={handleConfirmDefectStatusUpdate}
        requirement={statusUpdateInfo.defect ? { requirementUserIdentifier: statusUpdateInfo.defect.title } : null}
        newStatus={statusUpdateInfo.newStatus}
      />

      <DefectModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSubmit={handleSubmitDefect} 
        defect={editingDefect} 
        projects={projects || []} 
        currentSelectedProject={selectedProject}
        allRequirements={allRequirements} 
      />
      {defectForHistory && (<DefectHistoryModal isOpen={isHistoryModalOpen} onClose={() => { setIsHistoryModalOpen(false); setDefectForHistory(null); setDefectHistory([]);}} defect={defectForHistory} history={defectHistory} />)}
      <ConfirmationModal isOpen={isDeleteConfirmModalOpen} onClose={() => setIsDeleteConfirmModalOpen(false)} onConfirm={handleConfirmDelete} title="Confirm Defect Deletion" message={`Are you sure you want to permanently delete the defect "${defectToDelete?.title}"? This action cannot be undone.`} />
    </div>
  );
};

export default DefectsPage;