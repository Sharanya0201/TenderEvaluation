import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { useSidebar } from "../context/SidebarContext";

import '../styles/ManageTenderTypes.css';
import { 
  getTenderTypes, 
  createTenderType, 
  updateTenderType, 
  deleteTenderType,
  importTenderTypes 
} from '../api/auth';

const ManageTenderTypes = () => {
  const [tenderTypes, setTenderTypes] = useState({});
  const [editingType, setEditingType] = useState(null);
  const [newType, setNewType] = useState({ 
    code: '', 
    name: '', 
    config: '', 
    icon: '', 
    description: '' 
  });
  const [isEditing, setIsEditing] = useState(false);
  const [configUploads, setConfigUploads] = useState({});
  const { isCollapsed } = useSidebar();

  useEffect(() => {
    loadTenderTypes();
  }, []);

  const loadTenderTypes = async () => {
    try {
      const response = await getTenderTypes();
      if (response.success) {
        // Convert array to object format for compatibility
        const tenderTypesObj = {};
        response.tender_types.forEach(type => {
          tenderTypesObj[type.code] = {
            name: type.name,
            config: type.config_file_name,
            icon: type.icon,
            description: type.description,
            form_configs: type.form_configs || []
          };
        });
        setTenderTypes(tenderTypesObj);
      } else {
        toast.error('Failed to load tender types');
      }
    } catch (error) {
      console.error('Error loading tender types:', error);
      toast.error('Failed to load tender types');
    }
  };

  // Download Excel Template for Form Config
  const downloadConfigTemplate = (configFileName) => {
    const templateData = [
      ['Bid Details', 'Bid Details', 'Bid Details', 'EMD Detail', 'EMD Detail'], // Group
      ['Bid End Date/Time', 'Bid Opening Date/Time', 'Contract Period', 'Advisory Bank', 'EMD Amount'], // Name
      ['date time', 'date time', 'int', 'string', 'int'], // Type
      ['calender', 'calender', 'combobox', 'combobox', null] // Input Type
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    XLSX.utils.book_append_sheet(wb, ws, 'FormConfig');
    
    // Instructions sheet
    const instructions = [
      ['Form Configuration Template - Instructions'],
      [''],
      ['Row 1: Group - Section name for the field'],
      ['Row 2: Name - Display name of the field'],
      ['Row 3: Type - Data type (string, int, float, bool, date time, file attachment, table)'],
      ['Row 4: Input Type - Input control (calender, combobox, null for default)'],
      [''],
      ['Important:'],
      ['- Keep the exact column structure'],
      ['- For combobox fields, options are defined in code'],
      ['- File attachment fields are handled separately'],
      ['- Save as Excel file before uploading']
    ];
    const instructionWs = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, instructionWs, 'Instructions');
    
    XLSX.writeFile(wb, `${configFileName.replace('.json', '')}_Template.xlsx`);
    toast.success(`Excel template downloaded for ${configFileName}`);
  };

  // Handle Excel Upload and Convert to JSON
  const handleConfigUpload = (event, configFileName) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to row-wise JSON
        const rowWiseData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rowWiseData.length < 4) {
          throw new Error('Excel must have at least 4 rows: group, name, type, inputType');
        }

        const numFields = Math.max(...rowWiseData.map(row => row.length));
        const fields = [];

        for (let col = 0; col < numFields; col++) {
          if (rowWiseData[1][col]) { // Only add if name exists
            fields.push({
              group: rowWiseData[0][col] || 'General',
              name: rowWiseData[1][col],
              type: rowWiseData[2][col] || 'string',
              inputType: rowWiseData[3][col] || null,
              options: rowWiseData[3][col] === 'combobox' ? [] : null
            });
          }
        }

        if (fields.length === 0) {
          throw new Error('No valid fields found in the Excel file');
        }

        // Store the converted JSON
        setConfigUploads(prev => ({
          ...prev,
          [configFileName]: fields
        }));

        toast.success(`✅ ${fields.length} fields parsed from Excel. Ready to save!`);
        
      } catch (error) {
        console.error('Error processing Excel file:', error);
        toast.error(`Error: ${error.message}`);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleSave = async (typeData) => {
    if (!typeData.code || !typeData.name || !typeData.config) {
      toast.error('Please fill in all required fields (Code, Name, Config)');
      return;
    }

    // Check if config file was uploaded (only required for new tender types)
    if (!configUploads[typeData.config] && !isEditing) {
      toast.error(`Please upload an Excel file for ${typeData.config} first`);
      return;
    }

    try {
      const tenderTypeData = {
        code: typeData.code,
        name: typeData.name,
        config_file_name: typeData.config,
        icon: typeData.icon,
        description: typeData.description,
        form_configs: configUploads[typeData.config] || []
      };

      if (isEditing) {
        // Update existing type
        const response = await updateTenderType(editingType, tenderTypeData);
        if (response.success) {
          toast.success(`Tender type "${typeData.name}" updated successfully!`);
          setEditingType(null);
          loadTenderTypes(); // Reload from database
        } else {
          toast.error('Failed to update tender type');
        }
      } else {
        // Create new type
        const response = await createTenderType(tenderTypeData);
        if (response.success) {
          toast.success(`Tender type "${typeData.name}" created successfully!`);
          loadTenderTypes(); // Reload from database
        } else {
          toast.error('Failed to create tender type');
        }
      }

      // Reset form
      setNewType({ code: '', name: '', config: '', icon: '', description: '' });
      setIsEditing(false);
      setEditingType(null);
    } catch (error) {
      console.error('Error saving tender type:', error);
      toast.error('Failed to save tender type');
    }
  };

  const handleEdit = (typeCode) => {
    const type = tenderTypes[typeCode];
    setNewType({
      code: typeCode,
      name: type.name,
      config: type.config,
      icon: type.icon,
      description: type.description
    });
    setEditingType(typeCode);
    setIsEditing(true);
    
    // Load existing form configurations for editing
    if (type.form_configs && type.form_configs.length > 0) {
      setConfigUploads(prev => ({
        ...prev,
        [type.config]: type.form_configs
      }));
    }
    
    document.querySelector('.mtt-add-type-section').scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  const handleDelete = async (typeCode) => {
    if (window.confirm(`Are you sure you want to delete "${tenderTypes[typeCode]?.name}"? This action cannot be undone.`)) {
      try {
        const response = await deleteTenderType(typeCode);
        if (response.success) {
          toast.success(`Tender type "${tenderTypes[typeCode]?.name}" deleted successfully!`);
          loadTenderTypes(); // Reload from database
          
          if (editingType === typeCode) {
            setNewType({ code: '', name: '', config: '', icon: '', description: '' });
            setEditingType(null);
            setIsEditing(false);
          }
        } else {
          toast.error('Failed to delete tender type');
        }
      } catch (error) {
        // Extract error message from the error object
        let errorMessage = 'Failed to delete tender type. It may be in use by existing tenders.';
        
        if (error && typeof error === 'object') {
          if (error.message) {
            errorMessage = error.message;
          } else if (error.detail) {
            errorMessage = error.detail;
          } else if (error.response?.data?.detail) {
            errorMessage = error.response.data.detail;
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        // Display toast with the error message
        toast.error(errorMessage, { 
          autoClose: 7000, // 7 seconds to give users time to read
          position: "top-center",
        });
      }
    }
  };

  const handleCancelEdit = () => {
    setNewType({ code: '', name: '', config: '', icon: '', description: '' });
    setEditingType(null);
    setIsEditing(false);
    toast.info('Edit cancelled');
  };

  const isFormValid = () => {
    return newType.code && newType.name && newType.config;
  };

  const hasConfigUpload = (configFileName) => {
    return !!configUploads[configFileName];
  };

  // Import existing tender types from JSON files to database
  const handleImportFromFiles = async () => {
    try {
      // Load the existing JSON data
      const response = await import('../data/tenderTypes.json');
      const tenderTypesData = response.default || response;
      
      // Convert to the format expected by the API
      const importData = {};
      for (const [code, typeData] of Object.entries(tenderTypesData)) {
        importData[code] = {
          name: typeData.name,
          description: typeData.description,
          icon: typeData.icon,
          config: typeData.config,
          form_configs: typeData.form_configs || []  // Include form configs if available
        };
      }
      
      const result = await importTenderTypes(importData);
      if (result.success) {
        toast.success(`Imported ${result.imported_count} tender types successfully!`);
        loadTenderTypes(); // Reload from database
      } else {
        toast.error('Failed to import tender types');
      }
    } catch (error) {
      console.error('Error importing tender types:', error);
      toast.error('Failed to import tender types');
    }
  };

  return (
    <div className="mtt-container">
      
      <div className={`mtt-main-content ${isCollapsed ? 'mtt-collapsed' : 'mtt-expanded'}`}>
        <div className="mtt-form-container">
          <div className="mtt-header">
            <h2>Manage Tender Types</h2>
            <p className="mtt-subtitle">
              Add, edit, or remove tender types available in the system
            </p>
            <div className="mtt-header-actions">
              <button 
                className="mtt-import-btn" 
                onClick={handleImportFromFiles}
                title="Import existing tender types from JSON files to database"
              >
                📥 Import from Files
              </button>
            </div>
          </div>

          {/* Add/Edit Tender Type Form */}
          <div className="mtt-add-type-section">
            <h3>
              {isEditing ? `Edit Tender Type: ${tenderTypes[editingType]?.name}` : 'Add New Tender Type'}
            </h3>
            <div className="mtt-type-form">
              <div className="mtt-form-row">
                <div className="mtt-form-group">
                  <label>Type Code *</label>
                  <input
                    type="text"
                    value={newType.code}
                    onChange={(e) => setNewType({...newType, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., INTERNATIONAL"
                    disabled={isEditing}
                  />
                  {isEditing && (
                    <small className="mtt-field-hint">Type code cannot be changed</small>
                  )}
                </div>
                <div className="mtt-form-group">
                  <label>Display Name *</label>
                  <input
                    type="text"
                    value={newType.name}
                    onChange={(e) => setNewType({...newType, name: e.target.value})}
                    placeholder="e.g., International Tender"
                  />
                </div>
              </div>
              <div className="mtt-form-row">
                <div className="mtt-form-group">
                  <label>Config File *</label>
                  <input
                    type="text"
                    value={newType.config}
                    onChange={(e) => setNewType({...newType, config: e.target.value})}
                    placeholder="e.g., internationalFormConfig.json"
                  />
                  <small className="mtt-field-hint">Name of the JSON config file</small>
                </div>
                <div className="mtt-form-group">
                  <label>Icon</label>
                  <input
                    type="text"
                    value={newType.icon}
                    onChange={(e) => setNewType({...newType, icon: e.target.value})}
                    placeholder="e.g., 🌍"
                  />
                  <small className="mtt-field-hint">Emoji or icon character</small>
                </div>
              </div>
              <div className="mtt-form-group">
                <label>Description</label>
                <textarea
                  value={newType.description}
                  onChange={(e) => setNewType({...newType, description: e.target.value})}
                  placeholder="Describe this tender type..."
                  rows="3"
                />
              </div>

              {/* Config File Upload Section */}
              {newType.config && (
                <div className="mtt-config-upload-section">
                  <h4>Form Configuration</h4>
                  
                  {/* Show existing configurations when editing */}
                  {isEditing && hasConfigUpload(newType.config) && (
                    <div className="mtt-existing-config">
                      <h5>Current Configuration</h5>
                      <div className="mtt-config-info">
                        <span>✅ {configUploads[newType.config]?.length} fields configured</span>
                        <button 
                          type="button"
                          className="mtt-clear-config-btn"
                          onClick={() => {
                            setConfigUploads(prev => {
                              const newConfigs = { ...prev };
                              delete newConfigs[newType.config];
                              return newConfigs;
                            });
                            toast.info('Configuration cleared. Upload a new Excel file to replace it.');
                          }}
                        >
                          🗑️ Clear Configuration
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mtt-upload-actions">
                    <button 
                      type="button"
                      className="mtt-download-template-btn"
                      onClick={() => downloadConfigTemplate(newType.config)}
                    >
                      📥 Download Excel Template
                    </button>
                    <div className="mtt-file-upload">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => handleConfigUpload(e, newType.config)}
                        className="mtt-file-input"
                        id={`mtt-config-upload-${newType.config}`}
                      />
                      <label htmlFor={`mtt-config-upload-${newType.config}`} className="mtt-upload-label">
                        {hasConfigUpload(newType.config) ? '🔄 Replace Excel File' : '📤 Upload Excel File'}
                      </label>
                    </div>
                  </div>
                  {hasConfigUpload(newType.config) && (
                    <div className="mtt-upload-success">
                      <span>✅ {configUploads[newType.config]?.length} fields parsed successfully</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mtt-form-actions">
                {isEditing && (
                  <button 
                    className="mtt-cancel-button" 
                    onClick={handleCancelEdit}
                  >
                    Cancel Edit
                  </button>
                )}
                <button 
                  className={`mtt-submit-button ${!isFormValid() ? 'mtt-disabled' : ''}`}
                  onClick={() => handleSave(newType)}
                  disabled={!isFormValid() || (!isEditing && !hasConfigUpload(newType.config))}
                >
                  {isEditing ? 'Update Tender Type' : 'Add Tender Type'}
                </button>
              </div>
            </div>
          </div>

          {/* Existing Tender Types List */}
          <div className="mtt-types-list-section">
            <div className="mtt-section-header">
              <h3>Existing Tender Types</h3>
              <span className="mtt-type-count">
                {Object.keys(tenderTypes).length} type(s)
              </span>
            </div>
            
            {Object.keys(tenderTypes).length === 0 ? (
              <div className="mtt-empty-state">
                <div className="mtt-empty-icon">📋</div>
                <h4>No Tender Types Found</h4>
                <p>Add your first tender type using the form above</p>
              </div>
            ) : (
              <div className="mtt-types-grid">
                {Object.entries(tenderTypes).map(([code, type]) => (
                  <div key={code} className={`mtt-type-card ${editingType === code ? 'mtt-editing' : ''}`}>
                    <div className="mtt-type-header">
                      <span className="mtt-type-icon">{type.icon}</span>
                      <div className="mtt-type-info">
                        <h4>{type.name}</h4>
                        <span className="mtt-type-code">{code}</span>
                      </div>
                      {editingType === code && (
                        <span className="mtt-edit-badge">Editing</span>
                      )}
                    </div>
                    <p className="mtt-type-description">
                      {type.description || 'No description provided'}
                    </p>
                    <div className="mtt-type-config">
                      <small>Config: {type.config}</small>
                    </div>
                    <div className="mtt-type-actions">
                      <button 
                        className="mtt-edit-btn" 
                        onClick={() => handleEdit(code)}
                        disabled={editingType === code}
                      >
                        {editingType === code ? 'Editing...' : 'Edit'}
                      </button>
                      <button 
                        className="mtt-delete-btn" 
                        onClick={() => handleDelete(code)}
                        disabled={editingType === code}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageTenderTypes;