import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./Alert.css";

const AlertContext = createContext();

// 1. Move the hook inside the same file but ensure it is used correctly
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

// 2. The Provider Component
export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [confirmData, setConfirmData] = useState(null);

  const showAlert = useCallback(
    (message, type = "success", isDelete = false, onConfirm = null) => {
      if (onConfirm) {
        setConfirmData({ message, onConfirm });
        return;
      }

      const id = Date.now();
      setAlerts((prev) => [...prev, { id, message, type, isDelete }]);

      if (!isDelete) {
        setTimeout(() => {
          setAlerts((prev) => prev.filter((a) => a.id !== id));
        }, 4000);
      }
    },
    []
  );

  const closeAlert = (id) =>
    setAlerts((prev) => prev.filter((a) => a.id !== id));

  const handleConfirmAction = () => {
    if (confirmData?.onConfirm) {
      confirmData.onConfirm();
    }
    setConfirmData(null);
  };

  const getIcon = (type) => {
    if (type === "success") return "bi-check-lg";
    if (type === "error") return "bi-x-lg";
    return "bi-exclamation-lg";
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}

      <div className="alert-container">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              className={`alert-box ${alert.type}`}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            >
              <div className="alert-content">
                <i className={`bi ${getIcon(alert.type)}`}></i>
                <div>
                  <strong>{alert.type.toUpperCase()}</strong>
                  <p>{alert.message}</p>
                </div>
              </div>
              <button
                onClick={() => closeAlert(alert.id)}
                className="alert-close"
              >
                <i className="bi bi-x-circle-fill"></i>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmData && (
          <div className="modal-overlay">
            <motion.div
              className="confirm-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="confirm-icon">
                <i className="bi bi-trash3-fill"></i>
              </div>
              <h3>Are you sure?</h3>
              <p>{confirmData.message}</p>
              <div className="confirm-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setConfirmData(null)}
                >
                  Cancel
                </button>
                <button className="btn-delete" onClick={handleConfirmAction}>
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  );
};
