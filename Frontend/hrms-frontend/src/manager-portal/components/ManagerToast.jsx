import React from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import "./ManagerToast.css";

/**
 * Visual Toast Card component for Manager Portal alerts
 */
export const ManagerToastCard = ({
  t,
  type = "success",
  title,
  message,
}) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={18} strokeWidth={2.2} />;
      case "error":
        return <XCircle size={18} strokeWidth={2.2} />;
      case "warning":
        return <AlertTriangle size={18} strokeWidth={2.2} />;
      case "info":
      default:
        return <Info size={18} strokeWidth={2.2} />;
    }
  };

  const defaultTitle = () => {
    switch (type) {
      case "success":
        return "Action Approved";
      case "error":
        return "Action Declined";
      case "warning":
        return "Attention Required";
      case "info":
      default:
        return "System Notification";
    }
  };

  return (
    <div
      className={`mp-toast-card variant-${type} ${
        t?.visible ? "animate-enter" : "animate-leave"
      }`}
      role="alert"
    >
      <div className="mp-toast-icon-wrap">{getIcon()}</div>

      <div className="mp-toast-body">
        <div className="mp-toast-header-row">
          <span className="mp-toast-title">{title || defaultTitle()}</span>
          <span className="mp-toast-tag">MANAGER</span>
        </div>
        <div className="mp-toast-message">{message}</div>
      </div>

      <button
        type="button"
        className="mp-toast-close"
        onClick={() => toast.dismiss(t?.id)}
        aria-label="Close notification"
      >
        <X size={14} />
      </button>
    </div>
  );
};

/**
 * Reusable helper object for triggering Manager Portal toasts
 */
export const managerToast = {
  success: (message, options = {}) => {
    const title =
      options.title ||
      (typeof message === "string" && message.toLowerCase().includes("approv")
        ? "Request Approved"
        : "Success");
    return toast.custom(
      (t) => (
        <ManagerToastCard
          t={t}
          type="success"
          title={title}
          message={message}
        />
      ),
      {
        duration: options.duration || 4000,
        id: options.id,
      }
    );
  },

  error: (message, options = {}) => {
    const title =
      options.title ||
      (typeof message === "string" && message.toLowerCase().includes("reject")
        ? "Request Rejected"
        : "Error");
    return toast.custom(
      (t) => (
        <ManagerToastCard
          t={t}
          type="error"
          title={title}
          message={message}
        />
      ),
      {
        duration: options.duration || 4500,
        id: options.id,
      }
    );
  },

  warning: (message, options = {}) => {
    return toast.custom(
      (t) => (
        <ManagerToastCard
          t={t}
          type="warning"
          title={options.title || "Warning"}
          message={message}
        />
      ),
      {
        duration: options.duration || 4000,
        id: options.id,
      }
    );
  },

  info: (message, options = {}) => {
    return toast.custom(
      (t) => (
        <ManagerToastCard
          t={t}
          type="info"
          title={options.title || "Information"}
          message={message}
        />
      ),
      {
        duration: options.duration || 3500,
        id: options.id,
      }
    );
  },

  dismiss: (id) => toast.dismiss(id),
};

/**
 * Global Toaster element mounted in ManagerLayout.
 * Positioned fixed top-right with extremely high z-index (in front of all headers, modals, sidebars).
 */
export const ManagerToaster = () => {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerClassName="manager-toast-container"
      containerStyle={{
        top: 24,
        right: 24,
        zIndex: 99999999,
      }}
      toastOptions={{
        duration: 4000,
        className: "mp-base-toast",
      }}
    />
  );
};

export default managerToast;
