import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useSidebar } from '../context/SidebarContext';
import { 
  getTendersWithAttachments, 
  getVendorsForTender, 
  getVendorDocuments,
  processDocumentOCR,
  getVendorOCRResults,
  bulkProcessOCR,
  getOCRStatus,
  runAIEvaluation,
  getEvaluationResults,
  getEvaluationCriteria,
  exportEvaluationResults
} from '../api/auth';
import '../styles/AIEvaluation.css';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const AIEvaluationDashboard = () => {
  const { isCollapsed } = useSidebar();
  const [currentStep, setCurrentStep] = useState(1);
  const [tenders, setTenders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedTender, setSelectedTender] = useState(null);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [selectedCriteria, setSelectedCriteria] = useState([]);
  const [criteriaList, setCriteriaList] = useState([]);
  const [evaluationResults, setEvaluationResults] = useState([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [progress, setProgress] = useState(0);
  const [vendorDocuments, setVendorDocuments] = useState({});
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [ocrProgress, setOcrProgress] = useState({});
  const [loadingTenders, setLoadingTenders] = useState(false);
  const [loadingCriteria, setLoadingCriteria] = useState(false);

  useEffect(() => {
    const loadTenders = async () => {
      setLoadingTenders(true);
      try {
        const response = await getTendersWithAttachments();
        console.log('🚀 Fetched tenders with attachments:', response);
        
        const tendersWithVendorCounts = await Promise.all(
          response.map(async (tender) => {
            try {
              const vendorsResponse = await getVendorsForTender(tender.id);
              const vendorsArray = vendorsResponse.vendors || vendorsResponse.data || vendorsResponse;
              const vendorCount = Array.isArray(vendorsArray) ? vendorsArray.length : 0;
              
              return {
                ...tender,
                vendor_count: vendorCount
              };
            } catch (error) {
              console.error(`Failed to get vendors for tender ${tender.id}:`, error);
              return {
                ...tender,
                vendor_count: 0
              };
            }
          })
        );
        
        const transformedTenders = tendersWithVendorCounts.map(tender => ({
          id: tender.id,
          title: tender.tender,
          status: tender.status || 'draft',
          documentsUploaded: tender.has_attachments || tender.attachment_count > 0,
          ocrCompleted: tender.ocr_completed || false,
          vendors: tender.vendor_count || 0,
          description: tender.description,
          attachmentCount: tender.attachment_count || 0
        }));
        
        console.log('📊 Transformed tenders:', transformedTenders);
        setTenders(transformedTenders);
      } catch (error) {
        console.error('Failed to load tenders:', error);
        toast.error('Failed to load tenders');
      } finally {
        setLoadingTenders(false);
      }
    };
  
    loadTenders();
  }, []);

  // Load criteria from API
  useEffect(() => {
    const loadCriteria = async () => {
      setLoadingCriteria(true);
      try {
        const response = await getEvaluationCriteria();
        
        const criteriaArray = response.data || response.results || response.criteria || response;
        
        const activeCriteria = Array.isArray(criteriaArray) 
          ? criteriaArray
              .filter(criterion => criterion.is_active)
              .map(criterion => ({
                id: criterion.id,
                name: criterion.name,
                description: criterion.description,
                weightage: criterion.weightage,
                maxScore: criterion.max_score,
                category: criterion.category,
                isActive: criterion.is_active
              }))
          : [];
        
        setCriteriaList(activeCriteria);
        setSelectedCriteria(activeCriteria.map(c => c.id));
      } catch (error) {
        console.error('Failed to load evaluation criteria:', error);
        toast.error('Failed to load evaluation criteria');
      } finally {
        setLoadingCriteria(false);
      }
    };

    loadCriteria();
  }, []);

  // Load vendors when tender is selected
  useEffect(() => {
    const loadVendors = async () => {
      if (selectedTender) {
        try {
          const response = await getVendorsForTender(selectedTender.id);
          const vendorsArray = response.vendors || [];
          
          const vendorsWithDetails = vendorsArray.map(vendor => ({
            id: vendor.id,
            name: vendor.vendor_name,
            orgType: vendor.org_type,
            contactPerson: vendor.contact_person_name,
            email: vendor.contact_person_email,
            phone: vendor.contact_person_mobile,
            tenderId: selectedTender.id,
            mappingId: vendor.mapping_id,
            mappingStatus: vendor.mapping_status,
            mappedDate: vendor.mapped_date,
            documentsUploaded: false,
            ocrCompleted: false,
            evaluationStatus: 'pending',
            documentCount: 0
          }));

          const vendorsWithDocStatus = await Promise.all(
            vendorsWithDetails.map(async (vendor) => {
              try {
                const documentsResponse = await getVendorDocuments(vendor.id);
                const hasDocuments = documentsResponse.documents && documentsResponse.documents.length > 0;
                
                return {
                  ...vendor,
                  documentsUploaded: hasDocuments,
                  documentCount: documentsResponse.documents?.length || 0
                };
              } catch (error) {
                console.error(`Failed to get documents for vendor ${vendor.id}:`, error);
                return {
                  ...vendor,
                  documentsUploaded: false,
                  documentCount: 0
                };
              }
            })
          );
          
          setVendors(vendorsWithDocStatus);
        } catch (error) {
          console.error('Failed to load vendors:', error);
          toast.error('Failed to load vendors');
        }
      }
    };

    loadVendors();
  }, [selectedTender]);

  // FIXED: Load documents with proper OCR status from database
  useEffect(() => {
    const loadDocumentsForSelectedVendors = async () => {
      if (selectedVendors.length > 0) {
        setLoadingDocuments(true);
        const documentsMap = {};
        
        for (const vendor of selectedVendors) {
          if (vendor.documentsUploaded) {
            try {
              console.log(`📂 Loading documents for vendor ${vendor.id}...`);
              
              // Get basic document info
              const documentsResponse = await getVendorDocuments(vendor.id);
              const documentsArray = documentsResponse.documents || [];
              console.log(`📄 Found ${documentsArray.length} documents for vendor ${vendor.id}`);
              
              // Get OCR results from database
              const vendorOCRResults = await getVendorOCRResults(vendor.id);
              console.log('🔍 Vendor OCR Results from DB:', vendorOCRResults);
              
              // Create map of document_id -> OCR result
              const ocrResultsMap = {};
              if (vendorOCRResults && vendorOCRResults.ocr_results) {
                vendorOCRResults.ocr_results.forEach(ocrResult => {
                  if (ocrResult && ocrResult.document_id) {
                    ocrResultsMap[ocrResult.document_id] = ocrResult;
                  }
                });
              }
              
              console.log(`🗺️ OCR results map:`, ocrResultsMap);
              
              // Merge document info with OCR results from database
              const documentsWithOCR = documentsArray.map(doc => {
                const ocrResult = ocrResultsMap[doc.id];
                
                // Determine status based on ACTUAL database state
                let ocrStatus = 'pending';
                let ocrText = null;
                let confidence = null;
                
                if (ocrResult) {
                  console.log(`📊 Document ${doc.id} has OCR result:`, ocrResult.status);
                  
                  if (ocrResult.status === 'completed' || ocrResult.status === 'corrected') {
                    ocrStatus = 'completed';
                    ocrText = ocrResult.corrected_text || ocrResult.ocr_text;
                    confidence = ocrResult.confidence;
                  } else if (ocrResult.status === 'failed') {
                    ocrStatus = 'failed';
                  } else if (ocrResult.status === 'processing') {
                    ocrStatus = 'processing';
                  }
                } else {
                  console.log(`⏳ Document ${doc.id} has no OCR result, defaulting to pending`);
                }
                
                return {
                  id: doc.id,
                  name: doc.original_filename,
                  type: doc.content_type || 'general',
                  originalUrl: doc.stored_filename,
                  fileSize: doc.file_size,
                  uploadDate: doc.uploaded_at,
                  ocrStatus: ocrStatus, // Use REAL status from database
                  ocrText: ocrText,     // Use REAL text from database
                  confidence: confidence, // Use REAL confidence from database
                  processing: false,    // Never start in processing state
                  ocrResult: ocrResult
                };
              });
              
              documentsMap[vendor.id] = documentsWithOCR;
              console.log(`✅ Loaded ${documentsWithOCR.length} documents for vendor ${vendor.id}`, documentsWithOCR);
              
            } catch (error) {
              console.error(`❌ Failed to load documents for vendor ${vendor.id}:`, error);
              // Fallback: load basic documents without OCR status
              try {
                const documentsResponse = await getVendorDocuments(vendor.id);
                const documentsArray = documentsResponse.documents || [];
                
                documentsMap[vendor.id] = documentsArray.map(doc => ({
                  id: doc.id,
                  name: doc.original_filename,
                  type: doc.content_type || 'general',
                  originalUrl: doc.stored_filename,
                  fileSize: doc.file_size,
                  uploadDate: doc.uploaded_at,
                  ocrStatus: 'pending',
                  ocrText: null,
                  confidence: null,
                  processing: false
                }));
              } catch (fallbackError) {
                console.error(`💥 Even fallback failed for vendor ${vendor.id}:`, fallbackError);
                documentsMap[vendor.id] = [];
              }
            }
          } else {
            documentsMap[vendor.id] = [];
          }
        }
        
        setVendorDocuments(documentsMap);
        setLoadingDocuments(false);
        console.log('🎉 Finished loading all vendor documents with proper OCR status');
      }
    };

    loadDocumentsForSelectedVendors();
  }, [selectedVendors]);

  const handleTenderSelect = async (tender) => {
    if (!tender.documentsUploaded) {
      toast.error('No documents uploaded for this tender');
      return;
    }
    setSelectedTender(tender);
    setSelectedVendors([]);
    setVendorDocuments({});
    setSelectedDocument(null);
    setCurrentStep(2);
  };

  const handleVendorToggle = (vendor) => {
    if (!vendor.documentsUploaded) {
      toast.error('No documents uploaded for this vendor');
      return;
    }
    setSelectedVendors(prev => 
      prev.find(v => v.id === vendor.id)
        ? prev.filter(v => v.id !== vendor.id)
        : [...prev, vendor]
    );
  };

  const handleSelectAllVendors = () => {
    const availableVendors = vendors.filter(v => v.documentsUploaded);
    setSelectedVendors(availableVendors);
  };

  const handleCriteriaToggle = (criterionId) => {
    setSelectedCriteria(prev =>
      prev.includes(criterionId)
        ? prev.filter(id => id !== criterionId)
        : [...prev, criterionId]
    );
  };

  const handleSelectAllCriteria = () => {
    setSelectedCriteria(criteriaList.map(c => c.id));
  };

  // Process OCR for all documents
  const processAllOCR = async () => {
    setIsProcessingOCR(true);
    
    // Get all pending documents
    const allDocuments = [];
    Object.entries(vendorDocuments).forEach(([vendorId, docs]) => {
      docs.forEach(doc => {
        if (doc.ocrStatus === 'pending') {
          allDocuments.push({ ...doc, vendorId });
        }
      });
    });

    setOcrProgress({ 
      total: allDocuments.length, 
      processed: 0,
      currentDocument: null 
    });

    // Process documents sequentially
    for (let i = 0; i < allDocuments.length; i++) {
      const document = allDocuments[i];
      
      try {
        // Update progress
        setOcrProgress(prev => ({ 
          ...prev, 
          processed: i,
          currentDocument: document.name
        }));

        // Update UI to show processing
        setVendorDocuments(prev => {
          const updated = { ...prev };
          if (updated[document.vendorId]) {
            updated[document.vendorId] = updated[document.vendorId].map(doc => 
              doc.id === document.id ? {
                ...doc,
                ocrStatus: 'processing',
                processing: true
              } : doc
            );
          }
          return updated;
        });

        // Process single document
        await processSingleOCR(document, document.vendorId);

        // Update progress after completion
        setOcrProgress(prev => ({ 
          ...prev, 
          processed: i + 1
        }));

        toast.info(`Processed ${i + 1}/${allDocuments.length}: ${document.name}`);
        
      } catch (error) {
        console.error(`Failed to process ${document.name}:`, error);
        // Continue with next document even if one fails
      }
      
      // Small delay between documents
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessingOCR(false);
    setOcrProgress({ total: 0, processed: 0, currentDocument: null });
    toast.success('🎉 OCR processing completed!');
  };

  // Process single document OCR
  const processSingleOCR = async (document, vendorId) => {
    try {
      console.log('🚀 Starting OCR processing for:', document.name);
      
      // Update UI to show processing immediately
      setVendorDocuments(prev => {
        const updated = { ...prev };
        if (updated[vendorId]) {
          updated[vendorId] = updated[vendorId].map(doc => 
            doc.id === document.id ? {
              ...doc,
              ocrStatus: 'processing',
              processing: true
            } : doc
          );
        }
        return updated;
      });

      // Start OCR processing
      await processDocumentOCR(document.id);
      
      // Poll for status
      let attempts = 0;
      const maxAttempts = 60;
      
      const pollStatus = async () => {
        attempts++;
        try {
          const statusResponse = await getOCRStatus(document.id);
          console.log(`📊 OCR status (attempt ${attempts}):`, statusResponse);
          
          if (statusResponse.status === 'completed') {
            // Update state with OCR results
            setVendorDocuments(prev => {
              const updated = { ...prev };
              if (updated[vendorId]) {
                updated[vendorId] = updated[vendorId].map(doc => 
                  doc.id === document.id ? {
                    ...doc,
                    ocrStatus: 'completed',
                    ocrText: statusResponse.ocr_text,
                    confidence: statusResponse.confidence,
                    processing: false
                  } : doc
                );
              }
              return updated;
            });
            
            if (selectedDocument && selectedDocument.id === document.id) {
              setSelectedDocument(prev => ({
                ...prev,
                ocrStatus: 'completed',
                ocrText: statusResponse.ocr_text,
                confidence: statusResponse.confidence,
                processing: false
              }));
            }
            
            toast.success(`✅ OCR completed for ${document.name}`);
            return true;
            
          } else if (statusResponse.status === 'failed') {
            setVendorDocuments(prev => {
              const updated = { ...prev };
              if (updated[vendorId]) {
                updated[vendorId] = updated[vendorId].map(doc => 
                  doc.id === document.id ? {
                    ...doc,
                    ocrStatus: 'failed',
                    processing: false
                  } : doc
                );
              }
              return updated;
            });
            toast.error(`❌ OCR failed for ${document.name}`);
            return true;
            
          } else if (statusResponse.status === 'processing') {
            if (attempts >= maxAttempts) {
              // Timeout
              setVendorDocuments(prev => {
                const updated = { ...prev };
                if (updated[vendorId]) {
                  updated[vendorId] = updated[vendorId].map(doc => 
                    doc.id === document.id ? {
                      ...doc,
                      ocrStatus: 'failed',
                      processing: false
                    } : doc
                  );
                }
                return updated;
              });
              toast.error(`⏰ OCR timeout for ${document.name}`);
              return true;
            } else {
              // Still processing
              setTimeout(pollStatus, 3000);
              return false;
            }
          }
        } catch (error) {
          console.error(`Polling error for ${document.name}:`, error);
          if (attempts < maxAttempts) {
            setTimeout(pollStatus, 3000);
            return false;
          } else {
            setVendorDocuments(prev => {
              const updated = { ...prev };
              if (updated[vendorId]) {
                updated[vendorId] = updated[vendorId].map(doc => 
                  doc.id === document.id ? {
                    ...doc,
                    ocrStatus: 'failed',
                    processing: false
                  } : doc
                );
              }
              return updated;
            });
            toast.error(`🔴 OCR failed for ${document.name}`);
            return true;
          }
        }
      };
      
      await pollStatus();
      
    } catch (error) {
      console.error(`OCR failed for ${document.name}:`, error);
      
      // Update status to failed
      setVendorDocuments(prev => {
        const updated = { ...prev };
        if (updated[vendorId]) {
          updated[vendorId] = updated[vendorId].map(doc => 
            doc.id === document.id ? {
              ...doc,
              ocrStatus: 'failed',
              processing: false
            } : doc
          );
        }
        return updated;
      });
      
      if (error.response?.status === 409) {
        toast.info(`🔄 OCR already in progress for ${document.name}`);
      } else {
        toast.error(`❌ Failed to process ${document.name}`);
      }
    }
  };

  const runAIEvaluation = async () => {
    if (selectedVendors.length === 0 || selectedCriteria.length === 0) {
      toast.error('Please select at least one vendor and criteria');
      return;
    }

    // Check if any documents need OCR
    const needsOCR = Object.values(vendorDocuments).some(docs => 
      docs.some(doc => doc.ocrStatus !== 'completed')
    );

    if (needsOCR) {
      toast.error('Please complete OCR processing for all documents first');
      return;
    }

    setIsEvaluating(true);
    setProgress(0);
    setCurrentStep(4);

    const evaluationPayload = {
      tender_id: selectedTender.id,
      vendor_ids: selectedVendors.map(v => v.id),
      criteria_ids: selectedCriteria,
      documents_data: selectedVendors.map(vendor => ({
        vendor_id: vendor.id,
        documents: (vendorDocuments[vendor.id] || []).map(doc => ({
          document_id: doc.id,
          ocr_text: doc.ocrText,
          confidence: doc.confidence
        }))
      }))
    };

    try {
      const evaluationResponse = await runAIEvaluation(evaluationPayload);
      
      const transformedResults = evaluationResponse.results.map(result => ({
        vendorId: result.vendor_id,
        vendorName: result.vendor_name,
        tenderId: result.tender_id,
        tenderTitle: result.tender_title,
        criteriaScores: result.criteria_scores,
        overallScore: result.overall_score,
        qualification: result.qualification_status,
        documentQuality: result.document_quality_score,
        evaluationDate: result.evaluation_date,
        aiModelUsed: result.ai_model,
        processingTime: result.processing_time,
        documentsAnalyzed: result.documents_analyzed
      }));

      setEvaluationResults(transformedResults);
      toast.success('AI Evaluation Completed!');
    } catch (error) {
      console.error('AI Evaluation failed:', error);
      toast.error('Failed to complete AI evaluation');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleExportResults = async () => {
    if (evaluationResults.length === 0) {
      toast.error('No results to export');
      return;
    }

    try {
      const evaluationId = evaluationResults[0]?.evaluationId || 'combined';
      const response = await exportEvaluationResults(evaluationId, 'pdf');
      
      if (response.download_url) {
        const link = document.createElement('a');
        link.href = response.download_url;
        link.download = `evaluation-results-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Export downloaded successfully');
      } else {
        toast.info('Export initiated - check your downloads');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export results');
    }
  };

  const resetEvaluation = () => {
    setSelectedTender(null);
    setSelectedVendors([]);
    setSelectedCriteria(criteriaList.map(c => c.id));
    setEvaluationResults([]);
    setVendorDocuments({});
    setSelectedDocument(null);
    setOcrProgress({});
    setCurrentStep(1);
  };

  const viewDocumentComparison = (vendorId, document) => {
    setSelectedDocument({
      vendorId,
      vendorName: selectedVendors.find(v => v.id === vendorId)?.name,
      ...document
    });
  };

  const closeDocumentViewer = () => {
    setSelectedDocument(null);
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: { text: 'Open', color: '#10b981' },
      evaluation: { text: 'Evaluation', color: '#f59e0b' },
      draft: { text: 'Draft', color: '#6b7280' },
      awarded: { text: 'Awarded', color: '#3b82f6' },
      closed: { text: 'Closed', color: '#ef4444' }
    };
    const badge = badges[status] || { text: status, color: '#6b7280' };
    return <span className="aed-badge" style={{ backgroundColor: badge.color }}>{badge.text}</span>;
  };

  const getEvaluationBadge = (status) => {
    const badges = {
      pending: { text: 'Pending', color: '#f59e0b' },
      completed: { text: 'Completed', color: '#10b981' },
      cannot_evaluate: { text: 'Cannot Evaluate', color: '#ef4444' },
      in_progress: { text: 'In Progress', color: '#3b82f6' }
    };
    const badge = badges[status] || { text: status, color: '#6b7280' };
    return <span className="aed-badge" style={{ backgroundColor: badge.color }}>{badge.text}</span>;
  };

  const getOcrBadge = (status) => {
    const badges = {
      pending: { text: 'OCR Pending', color: '#f59e0b' },
      processing: { text: 'Processing', color: '#3b82f6' },
      completed: { text: 'OCR Completed', color: '#10b981' },
      failed: { text: 'OCR Failed', color: '#ef4444' }
    };
    const badge = badges[status] || { text: status, color: '#6b7280' };
    return <span className="aed-badge" style={{ backgroundColor: badge.color }}>{badge.text}</span>;
  };

// FIXED: Check if any documents need OCR processing
const hasPendingOCR = Object.values(vendorDocuments).some(docs => 
  docs && docs.some(doc => doc.ocrStatus === 'pending' || doc.ocrStatus === 'processing')
);

// FIXED: Check if ALL selected vendors' documents are completed
const allDocumentsCompleted = selectedVendors.every(vendor => {
  const vendorDocs = vendorDocuments[vendor.id] || [];
  // If vendor has no documents, they're automatically "completed" for evaluation
  if (vendorDocs.length === 0) return true;
  // Check if all documents for this vendor are completed
  return vendorDocs.every(doc => doc.ocrStatus === 'completed');
});

// FIXED: Check if there are any completed documents at all
const hasAnyCompletedOCR = Object.values(vendorDocuments).some(docs => 
  docs && docs.some(doc => doc.ocrStatus === 'completed')
);

  // Format file size from bytes to human readable
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date to readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Format document type
    const formatDocumentType = (contentType) => {
      if (!contentType) return 'Document';
      
      const typeMap = {
        'application/pdf': 'PDF Document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Microsoft Word',
        'application/msword': 'Microsoft Word',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Microsoft Excel',
        'application/vnd.ms-excel': 'Microsoft Excel',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'Microsoft PowerPoint',
        'application/vnd.ms-powerpoint': 'Microsoft PowerPoint',
        'text/plain': 'Text File',
        'text/csv': 'CSV File',
        'image/jpeg': 'JPEG Image',
        'image/png': 'PNG Image',
        'image/gif': 'GIF Image',
        'image/tiff': 'TIFF Image',
        'application/zip': 'ZIP Archive',
        'application/x-rar-compressed': 'RAR Archive'
      };
      
      return typeMap[contentType] || contentType.split('/')[1]?.toUpperCase() || 'Document';
    };

  // Helper function to get pending document count
const getPendingDocumentCount = () => {
  let count = 0;
  Object.values(vendorDocuments).forEach(docs => {
    if (docs) {
      docs.forEach(doc => {
        if (doc.ocrStatus === 'pending' || doc.ocrStatus === 'processing') {
          count++;
        }
      });
    }
  });
  return count;
};

  return (
    <div className="aed-container">
      
      
      <div className={`aed-main-content ${isCollapsed ? 'aed-collapsed' : 'aed-expanded'}`}>
        {/* Header */}
        <div className="aed-header">
          <div className="aed-header-content">
            <h1 className="aed-title">AI-Based Auto Evaluations</h1>
            <p className="aed-subtitle">
              Automated vendor evaluation using AI, OCR, and NLP technologies
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="aed-progress-steps">
          <div className={`aed-step ${currentStep >= 1 ? 'aed-active' : ''}`}>
            <div className="aed-step-number">1</div>
            <div className="aed-step-label">Select Tender</div>
          </div>
          <div className={`aed-step ${currentStep >= 2 ? 'aed-active' : ''}`}>
            <div className="aed-step-number">2</div>
            <div className="aed-step-label">Choose Vendors</div>
          </div>
          <div className={`aed-step ${currentStep >= 3 ? 'aed-active' : ''}`}>
            <div className="aed-step-number">3</div>
            <div className="aed-step-label">Extract Text (OCR)</div>
          </div>
          <div className={`aed-step ${currentStep >= 4 ? 'aed-active' : ''}`}>
            <div className="aed-step-number">4</div>
            <div className="aed-step-label">AI Evaluation</div>
          </div>
        </div>

        {/* Step 1: Tender Selection */}
        {currentStep === 1 && (
          <div className="aed-step-content">
            <h2>Select a Tender for Evaluation</h2>
            <p className="aed-step-description">
              Choose a tender to evaluate vendors. Documents must be uploaded for evaluation.
            </p>
            
            {loadingTenders ? (
              <div className="aed-loading">
                <div className="aed-spinner"></div>
                <p>Loading tenders...</p>
              </div>
            ) : (
              <div className="aed-tender-grid">
                {tenders.map(tender => (
                  <div 
                    key={tender.id}
                    className={`aed-tender-card ${selectedTender?.id === tender.id ? 'aed-selected' : ''} ${!tender.documentsUploaded ? 'aed-disabled' : ''}`}
                    onClick={() => handleTenderSelect(tender)}
                  >
                    <div className="aed-tender-header">
                      <h3 className="aed-tender-title">{tender.title}</h3>
                      {getStatusBadge(tender.status)}
                    </div>
                    
                    <div className="aed-tender-details">
                      <div className="aed-tender-info">
                        <span className="aed-info-label">Vendors:</span>
                        <span className="aed-info-value">{tender.vendors}</span>
                      </div>
                      <div className="aed-tender-info">
                        <span className="aed-info-label">Documents:</span>
                        <span className={`aed-info-value ${tender.documentsUploaded ? 'aed-success' : 'aed-warning'}`}>
                          {tender.documentsUploaded ? 'Uploaded' : 'Not Uploaded'}
                        </span>
                      </div>
                      <div className="aed-tender-info">
                        <span className="aed-info-label">OCR Status:</span>
                        <span className={`aed-info-value ${tender.ocrCompleted ? 'aed-success' : 'aed-warning'}`}>
                          {tender.ocrCompleted ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    
                    {!tender.documentsUploaded && (
                      <div className="aed-disabled-overlay">
                        Documents not uploaded
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Vendor Selection */}
        {currentStep === 2 && (
          <div className="aed-step-content">
            <div className="aed-step-header">
              <h2>Select Vendors for Evaluation</h2>
              <button 
                className="aed-back-btn"
                onClick={() => setCurrentStep(1)}
              >
                ← Back to Tenders
              </button>
            </div>
            
            <p className="aed-step-description">
              Selected Tender: <strong>{selectedTender?.title}</strong>
            </p>

            <div className="aed-vendor-selection">
              <div className="aed-selection-header">
                <h3>Available Vendors ({vendors.length})</h3>
                <button 
                  className="aed-select-all-btn"
                  onClick={handleSelectAllVendors}
                  disabled={vendors.filter(v => v.documentsUploaded).length === 0}
                >
                  Select All Available
                </button>
              </div>

              <div className="aed-vendor-list">
                {vendors.map(vendor => (
                  <div 
                    key={vendor.id}
                    className={`aed-vendor-item ${selectedVendors.find(v => v.id === vendor.id) ? 'aed-selected' : ''} ${!vendor.documentsUploaded ? 'aed-disabled' : ''}`}
                    onClick={() => handleVendorToggle(vendor)}
                  >
                    <div className="aed-vendor-checkbox">
                      <input 
                        type="checkbox"
                        checked={!!selectedVendors.find(v => v.id === vendor.id)}
                        onChange={() => {}}
                        disabled={!vendor.documentsUploaded}
                      />
                    </div>
                    
                    <div className="aed-vendor-info">
                      <h4 className="aed-vendor-name">{vendor.name}</h4>
                      <div className="aed-vendor-details">
                        <span className={`aed-document-status ${vendor.documentsUploaded ? 'aed-success' : 'aed-warning'}`}>
                          {vendor.documentsUploaded ? '📄 Documents Uploaded' : '❌ No Documents'}
                        </span>
                        <span className="aed-document-count">
                          ({vendor.documentCount} documents)
                        </span>
                      </div>
                    </div>
                    
                    {!vendor.documentsUploaded && (
                      <div className="aed-disabled-overlay">
                        No documents uploaded
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="aed-step-actions">
                <button 
                  className="aed-next-btn"
                  onClick={() => setCurrentStep(3)}
                  disabled={selectedVendors.length === 0}
                >
                  Extract Text with OCR ({selectedVendors.length} vendors selected)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: OCR Processing */}
        {currentStep === 3 && (
          <div className="aed-step-content">
            <div className="aed-step-header">
              <h2>Extract Text from Documents (OCR)</h2>
              <button 
                className="aed-back-btn"
                onClick={() => setCurrentStep(2)}
              >
                ← Back to Vendors
              </button>
            </div>

            <div className="aed-ocr-processing">
              <div className="aed-selection-header">
                <h3>Document OCR Processing</h3>
                <div className="aed-ocr-actions">
                  {hasPendingOCR && (
                    <button 
                      className="aed-ocr-process-btn"
                      onClick={processAllOCR}
                      disabled={isProcessingOCR}
                    >
                      {isProcessingOCR ? 'Processing...' : '🚀 Run OCR on All Documents'}
                    </button>
                  )}
                </div>
              </div>

              {isProcessingOCR && (
                <div className="aed-ocr-progress">
                  <h4>OCR Processing in Progress...</h4>
                  <div className="aed-progress-bar">
                    <div 
                      className="aed-progress-fill"
                      style={{ width: `${(ocrProgress.processed / ocrProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="aed-progress-text">
                    Processing document {ocrProgress.processed + 1} of {ocrProgress.total}
                    {ocrProgress.currentDocument && (
                      <span className="aed-current-document">
                        Current: {ocrProgress.currentDocument}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {loadingDocuments ? (
                <div className="aed-loading-documents">
                  <div className="aed-spinner"></div>
                  <p>Loading vendor documents...</p>
                </div>
              ) : (
                <div className="aed-vendor-documents">
                  {selectedVendors.map(vendor => (
                    <div key={vendor.id} className="aed-vendor-document-section">
                      <h4 className="aed-vendor-document-title">
                        {vendor.name} 
                        <span className="aed-document-count">
                          ({vendorDocuments[vendor.id]?.length || 0} documents)
                        </span>
                      </h4>
                      
                      <div className="aed-document-grid">
                        {(vendorDocuments[vendor.id] || []).map(document => (
                          <div key={document.id} className="aed-document-card">
                            <div className="aed-document-header">
                              <h5 className="aed-document-name">{document.name}</h5>
                              {getOcrBadge(document.ocrStatus)}
                            </div>
                            
                            <div className="aed-document-details">
                              <span className="aed-document-type">
                                {formatDocumentType(document.type)}
                              </span>
                              <span className="aed-document-size">
                                {formatFileSize(document.fileSize)}
                              </span>
                              <span className="aed-document-date">
                                {formatDate(document.uploadDate)}
                              </span>
                            </div>

                            {document.ocrStatus === 'completed' && (
                              <div className="aed-document-preview">
                                <div className="aed-ocr-preview">
                                  {document.ocrText?.substring(0, 150)}...
                                </div>
                                <div className="aed-ocr-confidence">
                                  Confidence: {(document.confidence * 100).toFixed(1)}%
                                </div>
                              </div>
                            )}

                            <div className="aed-document-actions">
                              <button 
                                className="aed-view-doc-btn"
                                onClick={() => viewDocumentComparison(vendor.id, document)}
                                disabled={document.ocrStatus !== 'completed'}
                              >
                                {document.ocrStatus === 'completed' ? '📊 View Text' : '👁️ View'}
                              </button>
                              {document.ocrStatus === 'pending' && (
                                <button 
                                  className="aed-ocr-single-btn"
                                  onClick={() => processSingleOCR(document, vendor.id)}
                                  disabled={isProcessingOCR || document.processing}
                                >
                                  {document.processing ? '⏳ Processing...' : '🚀 Run OCR'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {(vendorDocuments[vendor.id] || []).length === 0 && (
                        <div className="aed-no-documents">
                          No documents available for this vendor
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="aed-step-actions">
                <button 
                  className="aed-next-btn aed-evaluate-btn"
                  onClick={runAIEvaluation}
                  disabled={!allDocumentsCompleted || hasPendingOCR}
                >
                  🚀 Run AI Evaluation
                </button>
                <p className="aed-helper-text">
                  {hasPendingOCR 
                    ? `Complete OCR processing for all documents to enable AI evaluation (${getPendingDocumentCount()} pending)` 
                    : allDocumentsCompleted 
                      ? 'All documents processed and ready for AI evaluation' 
                      : 'Some vendors have no documents or incomplete OCR processing'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: AI Evaluation & Results */}
        {currentStep === 4 && (
          <div className="aed-step-content">
            <div className="aed-step-header">
              <h2>AI Evaluation Results</h2>
              <button 
                className="aed-back-btn"
                onClick={resetEvaluation}
                disabled={isEvaluating}
              >
                ← New Evaluation
              </button>
            </div>

            {isEvaluating ? (
              <div className="aed-evaluation-progress">
                <h3>AI Evaluation in Progress...</h3>
                <div className="aed-progress-bar">
                  <div 
                    className="aed-progress-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="aed-progress-text">
                  Evaluating vendors using AI... {progress.toFixed(0)}%
                </p>
                <div className="aed-ai-processing">
                  <div className="aed-ai-icon">🤖</div>
                  <p>AI is analyzing extracted text and generating scores...</p>
                </div>
              </div>
            ) : (
              <div className="aed-results-container">
                <div className="aed-results-summary">
                  <h3>Evaluation Summary</h3>
                  <div className="aed-summary-cards">
                    <div className="aed-summary-card">
                      <div className="aed-summary-value">{evaluationResults.length}</div>
                      <div className="aed-summary-label">Vendors Evaluated</div>
                    </div>
                    <div className="aed-summary-card">
                      <div className="aed-summary-value">
                        {evaluationResults.filter(r => r.qualification === 'Qualified').length}
                      </div>
                      <div className="aed-summary-label">Qualified</div>
                    </div>
                    <div className="aed-summary-card">
                      <div className="aed-summary-value">
                        {evaluationResults.filter(r => r.qualification === 'Disqualified').length}
                      </div>
                      <div className="aed-summary-label">Disqualified</div>
                    </div>
                    <div className="aed-summary-card">
                      <div className="aed-summary-value">
                        {evaluationResults.reduce((sum, r) => sum + r.documentsAnalyzed, 0)}
                      </div>
                      <div className="aed-summary-label">Documents Analyzed</div>
                    </div>
                  </div>
                </div>

                <div className="aed-results-table">
                  <h3>Detailed Results</h3>
                  <table className="aed-table">
                    <thead>
                      <tr>
                        <th>Vendor</th>
                        <th>Overall Score</th>
                        <th>Status</th>
                        <th>Documents</th>
                        <th>AI Model</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluationResults.map((result, index) => (
                        <tr key={result.vendorId} className={index % 2 === 0 ? 'aed-even' : 'aed-odd'}>
                          <td className="aed-vendor-cell">
                            <strong>{result.vendorName}</strong>
                          </td>
                          <td className="aed-score-cell">
                            <span className={`aed-score ${result.overallScore >= 70 ? 'aed-high' : 'aed-low'}`}>
                              {result.overallScore}%
                            </span>
                          </td>
                          <td className="aed-status-cell">
                            <span className={`aed-qualification ${result.qualification === 'Qualified' ? 'aed-qualified' : 'aed-disqualified'}`}>
                              {result.qualification}
                            </span>
                          </td>
                          <td className="aed-docs-cell">
                            <span className="aed-docs-count">{result.documentsAnalyzed} docs</span>
                          </td>
                          <td className="aed-model-cell">
                            <span className="aed-model">{result.aiModelUsed}</span>
                            <br />
                            <small>{result.processingTime}</small>
                          </td>
                          <td className="aed-actions-cell">
                            <button 
                              className="aed-view-details-btn"
                              onClick={() => toast.info(`Detailed criteria breakdown for ${result.vendorName}`)}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="aed-step-actions">
                  <button 
                    className="aed-export-btn"
                    onClick={handleExportResults}
                  >
                    📊 Export Results
                  </button>
                  <button 
                    className="aed-new-eval-btn"
                    onClick={resetEvaluation}
                  >
                    🔄 New Evaluation
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Document Comparison Modal */}
        {selectedDocument && (
          <div className="aed-modal-overlay" onClick={closeDocumentViewer}>
            <div className="aed-modal-content" onClick={e => e.stopPropagation()}>
              <div className="aed-modal-header">
                <h3>Document: {selectedDocument.name}</h3>
                <button className="aed-modal-close" onClick={closeDocumentViewer}>×</button>
              </div>
              
              <div className="aed-modal-body">
                {selectedDocument.processing && (
                  <div className="aed-ocr-progress-modal">
                    <div className="aed-processing-spinner large"></div>
                    <h4>Processing OCR...</h4>
                    <p>This may take a few minutes for large documents</p>
                  </div>
                )}
                
                {!selectedDocument.processing && (
                  <div className="aed-comparison-container">
                    <div className="aed-comparison-column">
                      <h4>Original Document</h4>
                      <div className="aed-document-viewer">
                        {selectedDocument.name.toLowerCase().endsWith('.pdf') ? (
                          <embed
                            src={`${API_BASE_URL}/api/v1/auth/vendors/${selectedDocument.vendorId}/documents/${selectedDocument.id}/view`}
                            type="application/pdf"
                            width="100%"
                            height="500px"
                            className="aed-pdf-embed"
                          />
                        ) : (
                          <div className="aed-file-preview">
                            <div className="aed-file-icon large">
                              {selectedDocument.name.toLowerCase().endsWith('.doc') || selectedDocument.name.toLowerCase().endsWith('.docx') ? '📝' : 
                              selectedDocument.name.toLowerCase().endsWith('.xls') || selectedDocument.name.toLowerCase().endsWith('.xlsx') ? '📊' :
                              selectedDocument.name.toLowerCase().endsWith('.ppt') || selectedDocument.name.toLowerCase().endsWith('.pptx') ? '📽️' : 
                              selectedDocument.name.toLowerCase().endsWith('.jpg') || selectedDocument.name.toLowerCase().endsWith('.jpeg') || selectedDocument.name.toLowerCase().endsWith('.png') ? '🖼️' : '📄'}
                            </div>
                            <h4>{selectedDocument.name}</h4>
                            <div className="aed-document-meta">
                              <div className="aed-meta-item">
                                <strong>Type:</strong> {formatDocumentType(selectedDocument.type)}
                              </div>
                              <div className="aed-meta-item">
                                <strong>Size:</strong> {formatFileSize(selectedDocument.fileSize)}
                              </div>
                              <div className="aed-meta-item">
                                <strong>Uploaded:</strong> {formatDate(selectedDocument.uploadDate)}
                              </div>
                            </div>
                            <div className="aed-file-actions">
                              {/* Only show download button for non-PDF files */}
                              <a 
                                href={`${API_BASE_URL}/api/v1/auth/vendors/${selectedDocument.vendorId}/documents/${selectedDocument.id}/download`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="aed-download-link"
                              >
                                📥 Download File
                              </a>
                            </div>
                            <div className="aed-file-note">
                              <small>
                                {selectedDocument.name.toLowerCase().endsWith('.doc') || selectedDocument.name.toLowerCase().endsWith('.docx') ? 
                                'Word documents are automatically converted to PDF for OCR processing' :
                                selectedDocument.name.toLowerCase().endsWith('.xls') || selectedDocument.name.toLowerCase().endsWith('.xlsx') ? 
                                'Excel files are processed to extract tabular data and text content' :
                                selectedDocument.name.toLowerCase().endsWith('.ppt') || selectedDocument.name.toLowerCase().endsWith('.pptx') ? 
                                'PowerPoint presentations are processed slide by slide' :
                                'Document content has been extracted using OCR technology'}
                              </small>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="aed-comparison-column">
                      <h4>
                        OCR Extracted Text 
                        {selectedDocument.confidence && selectedDocument.confidence > 0 && (
                          <span className="aed-ocr-confidence">
                            Confidence: {(selectedDocument.confidence * 100).toFixed(1)}%
                          </span>
                        )}
                      </h4>
                      <div className="aed-ocr-text-viewer">
                        {selectedDocument.ocrText ? (
                          <>
                            <div className="aed-ocr-text-actions">
                              <button 
                                className="aed-copy-text-btn"
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedDocument.ocrText);
                                  toast.success('Text copied to clipboard!');
                                }}
                              >
                                📋 Copy Text
                              </button>
                              <button 
                                className="aed-download-text-btn"
                                onClick={() => {
                                  const blob = new Blob([selectedDocument.ocrText], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${selectedDocument.name.split('.')[0]}_extracted_text.txt`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                  toast.success('Text downloaded!');
                                }}
                              >
                                💾 Download Text
                              </button>
                            </div>
                            <div className="aed-ocr-text-content">
                              <pre>{selectedDocument.ocrText}</pre>
                            </div>
                            <div className="aed-text-stats">
                              <span>Characters: {selectedDocument.ocrText.length}</span>
                              <span>Words: {selectedDocument.ocrText.split(/\s+/).filter(word => word.length > 0).length}</span>
                            </div>
                          </>
                        ) : (
                          <div className="aed-ocr-pending">
                            <div className="aed-ocr-icon">🔍</div>
                            <p>No OCR text available</p>
                            <p className="aed-ocr-help">
                              Click below to extract text from this document
                            </p>
                            <button 
                              className="aed-ocr-single-btn"
                              onClick={() => processSingleOCR(selectedDocument, selectedDocument.vendorId)}
                              disabled={isProcessingOCR || selectedDocument.processing}
                            >
                              {selectedDocument.processing ? '⏳ Processing...' : '🚀 Run OCR'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="aed-modal-footer">
                <button className="aed-btn-secondary" onClick={closeDocumentViewer}>
                  Close
                </button>
                <a 
                  href={`${API_BASE_URL}/api/v1/auth/vendors/${selectedDocument.vendorId}/documents/${selectedDocument.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aed-btn-secondary"
                >
                  📥 Download Original
                </a>
                {selectedDocument.ocrStatus === 'completed' && (
                  <button 
                    className="aed-btn-primary"
                    onClick={() => toast.info('OCR correction functionality would be implemented here')}
                  >
                    ✏️ Correct OCR Text
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIEvaluationDashboard;