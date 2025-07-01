import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import Select from 'react-select';
import "react-datepicker/dist/react-datepicker.css";

const RetrospectiveItemModal = ({ isOpen, onClose, onSubmit, item, columnTypes }) => {
  const [formData, setFormData] = useState({
    column_type: '',
    description: '',
    item_date: new Date(),
  });

  useEffect(() => {
    if (isOpen) {
      if (item && item.item_date) {
        const dateString = String(item.item_date);
        const parts = dateString.split('-');
        let parsedDate = new Date();

        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const day = parseInt(parts[2], 10);

          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            parsedDate = new Date(year, month - 1, day);
          }
        }

        setFormData({
          column_type: item.column_type || (columnTypes.length > 0 ? columnTypes[0].value : ''),
          description: item.description || '',
          item_date: parsedDate,
        });
      } else {
        setFormData({
          column_type: (columnTypes.length > 0 ? columnTypes[0].value : ''),
          description: '',
          item_date: new Date(),
        });
      }
    }
  }, [item, isOpen, columnTypes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name, selectedOption) => {
    setFormData(prev => ({...prev, [name]: selectedOption ? selectedOption.value : '' }));
  };

  const handleDateChange = (date) => {
    if (date) {
        setFormData(prev => ({ ...prev, item_date: date }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.column_type || !formData.description.trim() || !formData.item_date) {
      alert("Column, description, and date are required.");
      return;
    }

    const date = formData.item_date;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    onSubmit({
      ...formData,
      description: formData.description.trim(),
      item_date: formattedDate,
    });
  };

  if (!isOpen) return null;

  const customSelectStyles = {
    menuList: (base) => ({
      ...base,
      maxHeight: '180px',
      overflowY: 'auto',
    }),
    menuPortal: (base) => ({ 
      ...base, 
      zIndex: 9999 
    }),
  };

  return (
    <div className="add-new-modal-overlay">
      <div className="add-new-modal-content" style={{maxWidth: '600px'}}>
        <h2>{item ? 'Edit Retrospective Item' : 'Add Retrospective Item'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="retro-column-type">Column:</label>
            <Select
              id="retro-column-type"
              name="column_type"
              value={columnTypes.find(opt => opt.value === formData.column_type)}
              onChange={(option) => handleSelectChange('column_type', option)}
              options={columnTypes}
              styles={customSelectStyles}
              menuPortalTarget={document.body}
              required
            />
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
              selected={formData.item_date}
              onChange={handleDateChange}
              dateFormat="MM/dd/yyyy"
              className="notes-datepicker"
              wrapperClassName="date-picker-wrapper"
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