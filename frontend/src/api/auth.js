const API_BASE_URL = import.meta.env.VITE_API_URL ;

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = data?.detail || data?.message || data || `HTTP error! status: ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Specific API methods
export const apiGet = (endpoint, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'GET' });
};

export const apiPost = (endpoint, data = {}, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const apiPut = (endpoint, data = {}, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const apiDelete = (endpoint, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
};

// Auth-specific API calls
export const loginUser = async (userData) => {
  console.log(userData)
  return apiPost('/api/v1/auth/login', userData);
};


export const registerUser = async (userData) => {
  console.log(userData)
  return apiPost('/api/v1/auth/register', userData);
};

export const logoutUser = async () => {
  return apiPost('/api/v1/auth/logout');
};

export const verifyToken = async () => {
  return apiGet('/api/v1/auth/verify');
};

export const checkDuplicate = async (field, value) => {
  return apiPost('/api/v1/auth/check-duplicate', { field, value });
};

// User Management API calls
export const getUsers = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = queryParams ? `/api/v1/auth/users?${queryParams}` : '/api/v1/auth/users';
  return apiGet(endpoint);
};

export const getUserById = async (userId) => {
  return apiGet(`/api/v1/auth/users/${userId}`);
};

export const createUser = async (userData) => {
  // Make sure we're sending the correct field names for CREATE
  const formattedData = {
    username: userData.username,
    mobile_number: userData.mobile_number,
    email: userData.email,
    role_id: parseInt(userData.role_id),
    password: userData.password,
    confirm_password: userData.password // Same as password for validation
  };
  console.log('Creating user with data:', formattedData);
  return apiPost('/api/v1/auth/users', formattedData);
};

export const updateUser = async (userId, userData) => {
  // Only send fields that are being updated for UPDATE
  const formattedData = {
    mobile_number: userData.mobile_number,
    email: userData.email,
    role_id: parseInt(userData.role_id)
  };
  
  // Only include password if it's provided and not empty
  if (userData.password && userData.password.trim() !== '') {
    formattedData.password = userData.password;
  }
  
  console.log('Updating user with data:', formattedData);
  return apiPut(`/api/v1/auth/users/${userId}`, formattedData);
};

export const deleteUser = async (userId) => {
  return apiDelete(`/api/v1/auth/users/${userId}`);
};

export const toggleUserStatus = async (userId, isActive) => {
  return apiPut(`/api/v1/auth/users/${userId}/status`, { is_active: isActive });
};



// Role Management API calls
export const getRoles = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = queryParams ? `/api/v1/auth/roles?${queryParams}` : '/api/v1/auth/roles';
  return apiGet(endpoint);
};

export const getRoleById = async (roleId) => {
  return apiGet(`/api/v1/auth/roles/${roleId}`);
};

export const createRole = async (roleData) => {
  const formattedData = {
    role_name: roleData.role_name,
    description: roleData.description,
    is_active: roleData.is_active !== undefined ? roleData.is_active : true
  };
  console.log('Creating role with data:', formattedData);
  return apiPost('/api/v1/auth/roles', formattedData);
};

export const updateRole = async (roleId, roleData) => {
  const formattedData = {
    role_name: roleData.role_name,
    description: roleData.description,
    is_active: roleData.is_active
  };
  console.log('Updating role with data:', formattedData);
  return apiPut(`/api/v1/auth/roles/${roleId}`, formattedData);
};

export const deleteRole = async (roleId) => {
  return apiDelete(`/api/v1/auth/roles/${roleId}`);
};

export const toggleRoleStatus = async (roleId, isActive) => {
  return apiPut(`/api/v1/auth/roles/${roleId}/status`, { is_active: isActive });
};



// Vendor Registration API

export const registerVendor = async (vendorData) => {
  console.log(vendorData)
  return apiPost('/api/v1/auth/register_vendor', vendorData);
};

// Vendors APIs
export const fetchVendors = async () => {
  return apiGet('/api/v1/auth/vendors');
};

export const updateVendor = async (id, data = {}) => {
  return apiPut(`/api/v1/auth/vendors/${id}`, data);
};

export const deleteVendor = async (id) => {
  return apiDelete(`/api/v1/auth/vendors/${id}`);
};

// Multipart upload for vendor documents
export const uploadVendorDocuments = async (vendorId, files) => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const form = new FormData();
  files.forEach((file) => form.append('files', file));

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/v1/auth/vendors/${vendorId}/documents`, {
    method: 'POST',
    headers,
    body: form,
  });

  const contentType = res.headers.get('content-type');
  const data = contentType && contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error(data?.message || `Upload failed: ${res.status}`);
  }
  return data;
};

// Get vendor documents
export const getVendorDocuments = async (vendorId) => {
  return apiGet(`/api/v1/auth/vendors/${vendorId}/documents`);
};

// Delete vendor document
export const deleteVendorDocument = async (vendorId, documentId) => {
  return apiDelete(`/api/v1/auth/vendors/${vendorId}/documents/${documentId}`);
};

// --------------------------- TENDER TYPES API ---------------------------

// Get all tender types
export const getTenderTypes = async () => {
  return apiGet('/api/v1/auth/tender-types');
};

// Get tender type by code
export const getTenderTypeByCode = async (code) => {
  return apiGet(`/api/v1/auth/tender-types/${code}`);
};

// Create tender type
export const createTenderType = async (tenderTypeData) => {
  return apiPost('/api/v1/auth/tender-types', tenderTypeData);
};

// Update tender type
export const updateTenderType = async (code, tenderTypeData) => {
  return apiPut(`/api/v1/auth/tender-types/${code}`, tenderTypeData);
};

// Delete tender type
export const deleteTenderType = async (code) => {
  return apiDelete(`/api/v1/auth/tender-types/${code}`);
};

// Import tender types from JSON data
export const importTenderTypes = async (tenderTypesData) => {
  return apiPost('/api/v1/auth/tender-types/import', tenderTypesData);
};

// --------------------------- TENDERS API ---------------------------

export const createTender = async ({ tenderTypeCode, tenderTypeId, title, description, fields, fileFields, status }) => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const form = new FormData();
  form.append('tender_type_code', tenderTypeCode);
  if (tenderTypeId) form.append('tender_type_id', tenderTypeId.toString());
  if (title) form.append('tender', title);
  if (description) form.append('description', description);
  if (status) form.append('status', status);
  form.append('form_data_json', JSON.stringify(fields || {}));

  const keys = [];
  (fileFields || []).forEach(({ key, file }) => {
    if (file) {
      form.append('attachments', file);
      keys.push(key || '');
    }
  });
  if (keys.length) {
    keys.forEach(k => form.append('attachment_keys', k));
  }

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/v1/auth/tenders`, {
    method: 'POST',
    headers,
    body: form,
  });

  const contentType = res.headers.get('content-type');
  const data = contentType && contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = typeof data === 'string' ? data : (data?.message || data?.detail);
    throw new Error(msg || `Create tender failed: ${res.status}`);
  }
  return data;
};

export const getTenders = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.tender_type_code) queryParams.append('tender_type_code', filters.tender_type_code);
  if (filters.status) queryParams.append('status', filters.status);
  const queryString = queryParams.toString();
  return apiGet(queryString ? `/api/v1/auth/tenders?${queryString}` : '/api/v1/auth/tenders');
};

export const getTender = async (tenderId) => {
  return apiGet(`/api/v1/auth/tenders/${tenderId}`);
};

export const updateTender = async (tenderId, tenderData) => {
  return apiPut(`/api/v1/auth/tenders/${tenderId}`, tenderData);
};

export const deleteTender = async (tenderId) => {
  return apiDelete(`/api/v1/auth/tenders/${tenderId}`);
};


// Add these API calls to your existing auth.js file

// --------------------------- TENDER-VENDOR MAPPING API ---------------------------

// Create a single mapping
export const createTenderVendorMapping = async (mappingData) => {
  return apiPost('/api/v1/auth/tender-vendor-mappings', mappingData);
};

// Create bulk mappings
export const createBulkTenderVendorMappings = async (bulkData) => {
  return apiPost('/api/v1/auth/tender-vendor-mappings/bulk', bulkData);
};

// Get all mappings
export const getTenderVendorMappings = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = queryParams ? `/api/v1/auth/tender-vendor-mappings?${queryParams}` : '/api/v1/auth/tender-vendor-mappings';
  return apiGet(endpoint);
};

// Get vendors for a tender
export const getVendorsForTender = async (tenderId) => {
  return apiGet(`/api/v1/auth/tenders/${tenderId}/vendors`);
};

// Get tenders for a vendor
export const getTendersForVendor = async (vendorId) => {
  return apiGet(`/api/v1/auth/vendors/${vendorId}/tenders`);
};

// Get available vendors for a tender
export const getAvailableVendorsForTender = async (tenderId) => {
  return apiGet(`/api/v1/auth/tenders/${tenderId}/available-vendors`);
};

// Update a mapping
export const updateTenderVendorMapping = async (mappingId, mappingData) => {
  return apiPut(`/api/v1/auth/tender-vendor-mappings/${mappingId}`, mappingData);
};

// Delete a mapping
export const deleteTenderVendorMapping = async (mappingId) => {
  return apiDelete(`/api/v1/auth/tender-vendor-mappings/${mappingId}`);
};

// --------------------------- EVALUATION CRITERIA API ---------------------------

// Get all evaluation criteria
export const getEvaluationCriteria = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = queryParams ? `/api/v1/auth/evaluation-criteria?${queryParams}` : '/api/v1/auth/evaluation-criteria';
  return apiGet(endpoint);
};

// Get specific criterion
export const getEvaluationCriterion = async (criterionId) => {
  return apiGet(`/api/v1/auth/evaluation-criteria/${criterionId}`);
};

// Create new criterion
export const createEvaluationCriterion = async (criterionData) => {
  return apiPost('/api/v1/auth/evaluation-criteria', criterionData);
};

// Update criterion
export const updateEvaluationCriterion = async (criterionId, criterionData) => {
  return apiPut(`/api/v1/auth/evaluation-criteria/${criterionId}`, criterionData);
};

// Delete criterion
export const deleteEvaluationCriterion = async (criterionId) => {
  return apiDelete(`/api/v1/auth/evaluation-criteria/${criterionId}`);
};

// Toggle criterion status
export const toggleCriterionStatus = async (criterionId, isActive) => {
  return apiPut(`/api/v1/auth/evaluation-criteria/${criterionId}/status`, { is_active: isActive });
};

// Restore default criteria
export const restoreDefaultCriteria = async () => {
  return apiPost('/api/v1/auth/evaluation-criteria/restore-defaults');
};

// --------------------------- TENDER EVALUATIONS API ---------------------------

// Create tender evaluation
export const createTenderEvaluation = async (evaluationData) => {
  return apiPost('/api/v1/auth/tender-evaluations', evaluationData);
};

// Create bulk evaluations
export const createBulkEvaluations = async (bulkData) => {
  return apiPost('/api/v1/auth/tender-evaluations/bulk', bulkData);
};

// Get evaluation summary
export const getEvaluationSummary = async (tenderId, vendorId) => {
  return apiGet(`/api/v1/auth/tender-evaluations/summary?tender_id=${tenderId}&vendor_id=${vendorId}`);
};

// --------------------------- DOCUMENT OCR APIS ---------------------------

// Process OCR for single document
export const processDocumentOCR = async (documentId) => {
  return apiPost(`/api/v1/auth/documents/${documentId}/ocr-process`);
};

// Bulk OCR processing for multiple documents
export const bulkProcessOCR = async (documentIds) => {
  return apiPost('/api/v1/auth/documents/bulk-ocr-process', { document_ids: documentIds });
};

// Check OCR status for a document
export const getOCRStatus = async (documentId) => {
  return apiGet(`/api/v1/auth/documents/${documentId}/ocr-status`);
};

// Manual OCR text correction
export const correctOCRText = async (documentId, correctedText) => {
  return apiPut(`/api/v1/auth/documents/${documentId}/correct-text`, { corrected_text: correctedText });
};

// --------------------------- AI EVALUATION APIS ---------------------------

// Run AI evaluation on vendors
export const runAIEvaluation = async (evaluationData) => {
  return apiPost('/api/v1/auth/ai-evaluations/run', evaluationData);
};

// Get evaluation results
export const getEvaluationResults = async (evaluationId) => {
  return apiGet(`/api/v1/auth/ai-evaluations/${evaluationId}`);
};

// Get detailed scoring breakdown
export const getEvaluationDetails = async (evaluationId) => {
  return apiGet(`/api/v1/auth/ai-evaluations/${evaluationId}/details`);
};

// Get all AI evaluations
export const getAIEvaluations = async () => {
  return apiGet('/api/v1/auth/ai-evaluations');
};

// Delete AI evaluation
export const deleteAIEvaluation = async (evaluationId) => {
  return apiDelete(`/api/v1/auth/ai-evaluations/${evaluationId}`);
};

// --------------------------- EVALUATION CRITERIA CATEGORIES APIS ---------------------------

// Get criteria categories
export const getCriteriaCategories = async () => {
  return apiGet('/api/v1/auth/evaluation-criteria/categories');
};

// Get criteria by category
export const getCriteriaByCategory = async (category) => {
  return apiGet(`/api/v1/auth/evaluation-criteria/categories/${category}`);
};

// --------------------------- EVALUATION EXPORT APIS ---------------------------

// Export evaluation results (PDF/Excel)
export const exportEvaluationResults = async (evaluationId, format = 'pdf') => {
  return apiPost(`/api/v1/auth/ai-evaluations/${evaluationId}/export`, { format });
};

// Generate evaluation report
export const generateEvaluationReport = async (evaluationId) => {
  return apiGet(`/api/v1/auth/ai-evaluations/${evaluationId}/report`);
};

// Download exported file
export const downloadExportFile = async (exportId) => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const headers = {
    'Authorization': `Bearer ${token}`
  };

  const res = await fetch(`${API_BASE_URL}/api/v1/auth/exports/${exportId}/download`, {
    method: 'GET',
    headers
  });

  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }

  const blob = await res.blob();
  return blob;
};

// --------------------------- VENDOR ENHANCEMENT APIS ---------------------------

// Get vendor with OCR status
export const getVendorWithOCRStatus = async (vendorId) => {
  return apiGet(`/api/v1/auth/vendors/${vendorId}/ocr-status`);
};

// Get tender with OCR status
export const getTenderWithOCRStatus = async (tenderId) => {
  return apiGet(`/api/v1/auth/tenders/${tenderId}/ocr-status`);
};

// Add these to your existing API methods
export const getOCRResult = async (documentId) => {
  try {
    const response = await api.get(`/api/v1/auth/documents/${documentId}/ocr-result`);
    return response.data;
  } catch (error) {
    console.error(`Failed to get OCR result for document ${documentId}:`, error);
    // Return null if not found instead of throwing error
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const getVendorOCRResults = async (vendorId) => {
  try {
    const response = await apiGet(`/api/v1/auth/vendors/${vendorId}/ocr-results`);
    
   
    // Check if response.data has the expected structure
    if (response.data && response.data.ocr_results !== undefined) {
      return response.data;
    } else if (response && response.ocr_results !== undefined) {
      return response;
    } else {
      // Return default structure
      return {
        vendor_id: vendorId,
        total_documents: 0,
        ocr_results: []
      };
    }
  } catch (error) {
    return {
      vendor_id: vendorId,
      total_documents: 0,
      ocr_results: []
    };
  }
};

// --------------------------- BATCH OPERATION APIS ---------------------------

// Get batch operation status
export const getBatchOperationStatus = async (batchId) => {
  return apiGet(`/api/v1/auth/batch-operations/${batchId}`);
};

// Cancel batch operation
export const cancelBatchOperation = async (batchId) => {
  return apiPost(`/api/v1/auth/batch-operations/${batchId}/cancel`);
};

// --------------------------- TENDER ATTACHMENTS API ---------------------------

// Get attachments for a tender
export const getTenderAttachments = async (tenderId) => {
  return apiGet(`/api/v1/auth/tenders/${tenderId}/attachments`);
};

// Get attachment count for a tender
export const getTenderAttachmentCount = async (tenderId) => {
  return apiGet(`/api/v1/auth/tenders/${tenderId}/attachments/count`);
};

// Get all tenders with attachment info
export const getTendersWithAttachments = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.tender_type_code) queryParams.append('tender_type_code', filters.tender_type_code);
  if (filters.status) queryParams.append('status', filters.status);
  const queryString = queryParams.toString();
  
  return apiGet(queryString ? `/api/v1/auth/tenders-with-attachments?${queryString}` : '/api/v1/auth/tenders-with-attachments');
};