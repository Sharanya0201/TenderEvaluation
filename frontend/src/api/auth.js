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

export const checkDuplicate = async (field, value) => {
  return apiPost('/api/v1/auth/check-duplicate', { field, value });
};

//---------------------------------- REGISTER API ---------------------

export const registerUser = async (userData) => {
  console.log(userData)
  return apiPost('/api/v1/auth/register', userData);
};


//--------------------------------- LOGIN API -------------------------

// Auth-specific API calls
export const loginUser = async (userData) => {
  console.log(userData)
  return apiPost('/api/v1/auth/login', userData);
};

export const logoutUser = async () => {
  return apiPost('/api/v1/auth/logout');
};

export const verifyToken = async () => {
  return apiGet('/api/v1/auth/verify');
};



// --------------------------- TENDER TYPES  ---------------------------

// Get all tender types
export const getTenderTypes = async () => {
  return apiGet('/api/v1/auth/tender-types');
};


// Import tender types from JSON data
export const importTenderTypes = async (tenderTypesData) => {
  return apiPost('/api/v1/auth/tender-types/import', tenderTypesData);
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

//-------------------------- TENDER STATUS  -----------------

export const getTender = async (tenderId) => {
  return apiGet(`/api/v1/auth/tender/${tenderId}`);
};

export const getTenders = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.tender_type_code) queryParams.append('tender_type_code', filters.tender_type_code);
  if (filters.status) queryParams.append('status', filters.status);
  const queryString = queryParams.toString();
  return apiGet(queryString ? `/api/v1/auth/uploads/tenders?${queryString}` : '/api/v1/auth/uploads/tenders');
};

export const updateTender = async (tenderId, tenderData) => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  const formData = new FormData();
  if (tenderData.title) formData.append('title', tenderData.title);
  if (tenderData.status) formData.append('status', tenderData.status);
  
  const config = {
    method: 'PUT',
    headers: {},
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/uploads/tender/${tenderId}`, {
      ...config,
      body: formData,
    });

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

export const deleteTender = async (attachmentId) => {
  return apiDelete(`/api/v1/auth/uploads/tender/${attachmentId}`);
};


//------------------------- USER MANAGEMENT -----------------------

export const getUsers = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = queryParams ? `/api/v1/auth/users?${queryParams}` : '/api/v1/auth/users';
  return apiGet(endpoint);
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


//----------------------------- ROLE MANAGEMENT ---------------------------------

export const getRoles = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = queryParams ? `/api/v1/auth/roles?${queryParams}` : '/api/v1/auth/roles';
  return apiGet(endpoint);
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


// ------------------------------ EVALUATION CRITERIA------------------------------

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






