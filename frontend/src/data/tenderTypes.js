import tenderTypesData from './tenderTypes.json';
import gemFormConfig from './gemFormConfig.json'; // Import the actual config

// Map config files to their actual data
const configMap = {
  'gemFormConfig.json': gemFormConfig
  // Add other configs here when you create them
};

export const tenderTypes = tenderTypesData;

export const getTenderConfig = (tenderType) => {
  const configFile = tenderTypes[tenderType]?.config;
  return configMap[configFile] || gemFormConfig; // Return actual config array
};

export const getAvailableTenderTypes = () => {
  return Object.keys(tenderTypes);
};