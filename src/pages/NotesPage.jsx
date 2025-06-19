// src/pages/NotesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import ConfirmationModal from '../components/ConfirmationModal'; // Import confirmation modal

// --- KEYWORD CONFIGURATION ---
const KEYWORD_CONFIG = [
  { keyword: 'release date', type: 'release', label: 'Release Date' },
  { keyword: 'event', type: 'event', label: 'Event' },
  { keyword: 'call', type: 'call', label: 'Call' },
];
const DEFAULT_NOTE_TYPE = 'default';
const DEFAULT_NOTE_LABEL = 'General Note';

const getNoteType = (noteText) => {
  if (!noteText || noteText.trim() === "") {
    return null;
  }
  const lowerNoteText = noteText.toLowerCase();
  for (const config of KEYWORD_CONFIG) {
    if (lowerNoteText.includes(config.keyword.toLowerCase())) {
      return config.type;
    }
  }
  return DEFAULT_NOTE_TYPE;
};
// --- END KEYWORD CONFIGURATION ---

const NotesPage = ({ projects, apiBaseUrl, showMessage }) => {
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [noteText, setNoteText] = useState('');
  const [projectNotesMap, setProjectNotesMap] = useState({});
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [datesToHighlight, setDatesToHighlight] = useState([]);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // --- NEW: State for the clear confirmation modal ---
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const formatDateKey = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchNotesForProject = useCallback(async (project) => {
    if (!project) {
      setProjectNotesMap({});
      setNoteText('');
      setDatesToHighlight([]);
      return;
    }
    setIsLoadingNotes(true);
    try {
      const response = await fetch(`${apiBaseUrl}/notes/${project}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch notes for ${project}: ${response.statusText}`);
      }
      const result = await response.json();
      const notesData = result.data || {};
      setProjectNotesMap(notesData);
      const highlights = Object.entries(notesData)
        .map(([dateKey, text]) => {
          const noteType = getNoteType(text);
          if (noteType) {
            const [year, month, day] = dateKey.split('-').map(Number);
            return { date: new Date(year, month - 1, day), type: noteType };
          }
          return null;
        })
        .filter(item => item !== null);
      setDatesToHighlight(highlights);
      const currentDataDateKey = formatDateKey(selectedDate);
      setNoteText(notesData[currentDataDateKey] || '');
    } catch (error) {
      console.error("Error fetching notes:", error);
      if (showMessage) showMessage(`Error fetching notes: ${error.message}`, 'error');
      setProjectNotesMap({});
      setDatesToHighlight([]);
    } finally {
      setIsLoadingNotes(false);
    }
  }, [apiBaseUrl, selectedDate, showMessage]);

  useEffect(() => {
    fetchNotesForProject(selectedProject);
  }, [selectedProject, fetchNotesForProject]);

  useEffect(() => {
    const dateKey = formatDateKey(selectedDate);
    if (selectedProject) {
        setNoteText(projectNotesMap[dateKey] || '');
    } else {
        setNoteText('');
    }
  }, [selectedDate, projectNotesMap, selectedProject]);

  const handleSaveNote = useCallback(async (textToSave) => {
    if (!selectedProject) {
      if (showMessage) showMessage('Please select a project.', 'error');
      return;
    }
    const dateKey = formatDateKey(selectedDate);
    if (!dateKey) {
      if (showMessage) showMessage('Invalid date selected for note.', 'error');
      return;
    }
    setIsLoadingNotes(true);
    
    try {
      const response = await fetch(`${apiBaseUrl}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: selectedProject, noteDate: dateKey, noteText: textToSave }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Failed to process note: ${response.statusText}`);
      }
      const newNoteType = getNoteType(textToSave.trim());
      if (result.action === "deleted" || (result.action === "none" && textToSave.trim() === "")) {
        setNoteText(''); // Clear the textarea on successful deletion
        setProjectNotesMap(prev => {
          const newMap = { ...prev };
          delete newMap[dateKey];
          return newMap;
        });
        setDatesToHighlight(prev => prev.filter(d => formatDateKey(d.date) !== dateKey));
        if (showMessage) showMessage(result.action === "deleted" ? "Note deleted successfully!" : "Note cleared!", 'success');
      } else if (result.action === "saved") {
        setProjectNotesMap(prev => ({ ...prev, [dateKey]: result.data.noteText }));
        setDatesToHighlight(prev => {
          const existingIndex = prev.findIndex(d => formatDateKey(d.date) === dateKey);
          const newHighlight = { date: selectedDate, type: newNoteType };
          if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = newHighlight;
            return updated;
          }
          return [...prev, newHighlight];
        });
        if (showMessage) showMessage('Note saved successfully!', 'success');
      } else {
        if (showMessage) showMessage(result.message || 'Note processed.', 'success');
      }
    } catch (error) {
      console.error("Error saving/deleting note:", error);
      if (showMessage) showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setIsLoadingNotes(false);
    }
  }, [selectedProject, selectedDate, apiBaseUrl, showMessage]);

  // --- NEW: Handlers for the clear confirmation flow ---
  const handleClearRequest = () => {
    // We check if the note exists in the map, not just the text area
    const dateKey = formatDateKey(selectedDate);
    if (projectNotesMap[dateKey] && projectNotesMap[dateKey].trim()) {
      setIsConfirmClearOpen(true);
    }
  };

  const handleCancelClear = () => {
    setIsConfirmClearOpen(false);
  };

  const handleConfirmClear = async () => {
    handleCancelClear(); // Close modal immediately for better UX
    await handleSaveNote(''); // Call the save function with an empty string to trigger deletion
  };

  const renderDayContents = (dayOfMonth, date) => {
    const noteInfo = datesToHighlight.find(
      (d) =>
        d.date.getFullYear() === date.getFullYear() &&
        d.date.getMonth() === date.getMonth() &&
        d.date.getDate() === date.getDate()
    );
    let dotClassName = "note-dot";
    if (noteInfo) {
      if (noteInfo.type && noteInfo.type !== DEFAULT_NOTE_TYPE) {
        dotClassName += ` note-dot-${noteInfo.type}`;
      }
    }
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {dayOfMonth}
        {noteInfo && <span className={dotClassName}></span>}
      </div>
    );
  };

  const toggleLegend = () => setIsLegendOpen(!isLegendOpen);

  // --- CHANGE 1: Define a constant to check if a note is saved for the selected date ---
  // This is now the source of truth for whether a note can be cleared.
  const hasSavedNoteForSelectedDate = !!(projectNotesMap[formatDateKey(selectedDate)] && projectNotesMap[formatDateKey(selectedDate)].trim());

  return (
    <div className="notes-page-container">
      <h2>Daily Notes</h2>
      <div className="notes-controls">
        <div>
          <label htmlFor="note-project">Project:</label>
          <select
            id="note-project"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            disabled={!projects || projects.length === 0}
          >
            <option value="">-- Select Project --</option>
            {(projects || []).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="note-date">Date:</label>
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            dateFormat="MM/dd/yyyy"
            className="notes-datepicker"
            renderDayContents={renderDayContents}
            disabled={!selectedProject}
          />
        </div>
      </div>

      <div className="notes-legend">
        <div className="legend-title clickable" onClick={toggleLegend}>
          Calendar Dot Legend {isLegendOpen ? '▼' : '►'}
        </div>
        {isLegendOpen && (
          <div className="legend-content">
            <div className="legend-item">
              <span className="note-dot"></span>
              <span>{DEFAULT_NOTE_LABEL}</span>
            </div>
            {KEYWORD_CONFIG.map(config => (
              <div key={config.type} className="legend-item">
                <span className={`note-dot note-dot-${config.type}`}></span>
                <span>{config.label} (note contains "{config.keyword}")</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLoadingNotes && selectedProject && <p style={{textAlign: 'center', marginBottom: '10px'}}>Loading/Saving notes for {selectedProject}...</p>}

      {!isLoadingNotes && selectedProject ? (
        <div className="notes-editor-area">
          <h3>Notes for {selectedProject} on {selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? selectedDate.toLocaleDateString() : 'Select a date'}</h3>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows="15"
            placeholder="Write your notes here..."
            disabled={!selectedProject}
          />
          <div className="notes-actions-container">
            <button
              onClick={() => handleSaveNote(noteText)}
              className="save-note-button"
              disabled={isLoadingNotes || !selectedProject}
            >
              {isLoadingNotes ? 'Saving...' : 'Save Note'}
            </button>
            <button
              onClick={handleClearRequest}
              className="clear-note-button"
              // --- CHANGE 2: Update the disabled logic for the Clear Note button ---
              disabled={isLoadingNotes || !selectedProject || !hasSavedNoteForSelectedDate}
            >
              Clear Note
            </button>
          </div>
        </div>
      ) : (
        !isLoadingNotes && !selectedProject && <p className="select-project-prompt">Please select a project to view or add notes.</p>
      )}

      {/* --- NEW: Render the confirmation modal --- */}
      <ConfirmationModal
        isOpen={isConfirmClearOpen}
        onClose={handleCancelClear}
        onConfirm={handleConfirmClear}
        title="Confirm Clear Note"
        message={`Are you sure you want to permanently delete the note for ${selectedDate.toLocaleDateString()}? This action cannot be undone.`}
      />
    </div>
  );
};

export default NotesPage;