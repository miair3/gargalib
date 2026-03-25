export function getStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);

    if (!value || value === "undefined" || value === "null") {
      return fallback;
    }

    return JSON.parse(value);
  } catch {
    return fallback;
  }
}