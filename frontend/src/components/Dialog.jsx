import React from "react";
import "../styles/Dialog.module.css"; // Optional: create CSS for styling

export default function Dialog({
  open,
  onClose,
  title,
  message,
  type = "info",
  confirmText = "OK",
  cancelText = "Cancel",
  showCancel = true,
  onConfirm,
  onCancel
}) {
  if (!open) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "success":
        return "✅";
      default:
        return "ℹ️";
    }
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-container">
        <div className={`dialog-header dialog-${type}`}>
          <span className="dialog-icon">{getIcon()}</span>
          <h3 className="dialog-title">{title}</h3>
        </div>
        
        <div className="dialog-content">
          <p className="dialog-message">{message}</p>
        </div>
        
        <div className="dialog-actions">
          {showCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="dialog-btn dialog-btn-cancel"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className={`dialog-btn dialog-btn-${type}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
