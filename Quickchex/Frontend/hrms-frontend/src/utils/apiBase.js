export const getApiBaseUrl = () => {
  const isBrowser = typeof window !== "undefined" && Boolean(window.location?.hostname);
  const isLocalhost = isBrowser && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const envUrl = import.meta.env?.VITE_API_URL?.trim()?.replace(/\/$/, "");
  if (envUrl) {
    if (!isLocalhost && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
      return "https://quickchex-backend.onrender.com";
    }
    return envUrl;
  }

  if (isLocalhost) {
    return `http://${window.location.hostname}:8000`;
  }

  return "https://quickchex-backend.onrender.com";
};

export const API_BASE = getApiBaseUrl();

export default getApiBaseUrl;
