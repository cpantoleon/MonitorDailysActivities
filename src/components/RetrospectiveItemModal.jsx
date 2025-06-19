// src/components/RetrospectiveItemModal.jsx
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const RetrospectiveItemModal = ({ isOpen, onClose, onSubmit, item, columnTypes }) => {
  const [formData, setFormData] = useState({
    column_type: '',
    description: '',
    item_date: new Date(), // Represents local date for DatePicker
  });

  useEffect(() => {
    if (isOpen) {
      if (item && item.item_date) { // Editing existing item
        // item.item_date is expected to be a "YYYY-MM-DD" string from the backend
        const dateString = String(item.item_date);
        const parts = dateString.split('-');
        let parsedDate = new Date(); // Default to now if parsing fails or format is unexpected

        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10); // month is 1-12 from string
          const day = parseInt(parts[2], 10);

          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            // Create a new Date object using local timezone values.
            // Month is 0-indexed for Date constructor, so subtract 1.
            // This ensures the Date object represents midnight of that specific local day.
            parsedDate = new Date(year, month - 1, day);
          }
        }

        setFormData({
          column_type: item.column_type || (columnTypes.length > 0 ? columnTypes[0].value : ''),
          description: item.description || '',
          item_date: parsedDate, // Use the correctly parsed local date
        });
      } else { // Adding new item or item has no date
        setFormData({
          column_type: (columnTypes.length > 0 ? columnTypes[0].value : ''),
          description: '',
          item_date: new Date(), // Default to today's local date
        });
      }
    }
  }, [item, isOpen, columnTypes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => { // date from DatePicker is a local Date object
    if (date) { // Ensure date is not null (e.g., if user clears the DatePicker input)
        setFormData(prev => ({ ...prev, item_date: date }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.column_type || !formData.description.trim() || !formData.item_date) {
      alert("Column, description, and date are required.");
      return;
    }

    const date = formData.item_date; // This is a local Date object from the DatePicker
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth is 0-indexed
    const day = date.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`; // YYYY-MM-DD string of the local date

    onSubmit({
      ...formData, // Includes column_type, description, item_date (as Date object, but we override item_date next)
      description: formData.description.trim(),
      item_date: formattedDate, // Send YYYY-MM-DD string to backend
    });
  };

  if (!isOpen) return null;

  return (
    <div className="add-new-modal-overlay">
      <div className="add-new-modal-content" style={{maxWidth: '600px'}}>
        <h2>{item ? 'Edit Retrospective Item' : 'Add Retrospective Item'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="retro-column-type">Column:</label>
            <select
              id="retro-column-type"
              name="column_type"
              value={formData.column_type}
              onChange={handleChange}
              required
            >
              {columnTypes.map(ct => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="retro-description">Description:</label>
            <textarea
              id="retro-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="What happened? What did you observe?"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="retro-item-date">Date:</label>
            <DatePicker
              selected={formData.item_date} // This is a local Date object
              onChange={handleDateChange}
              dateFormat="MM/dd/yyyy" // How it appears in the input box
              className="notes-datepicker" // Ensure this class styles the input appropriately
              wrapperClassName="date-picker-wrapper" // For potential width adjustments
              placeholderText="Select a date"
            />
          </div>
          <div className="modal-actions">
            <button type="submit" className="modal-button-save">
              {item ? 'Save Changes' : 'Add Item'}
            </button>
            <button type="button" onClick={onClose} className="modal-button-cancel">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RetrospectiveItemModal;