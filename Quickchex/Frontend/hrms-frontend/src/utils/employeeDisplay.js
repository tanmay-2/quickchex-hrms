/**
 * Employee Display Utility
 * Handles name formatting, case-insensitive email fallback, duplicate prevention, and avatar initials.
 */

/**
 * Returns the display name for an employee.
 * Filters out employee IDs, strips domain from emails (e.g. "janhavi.s@laesfera.co" -> "janhavi.s"),
 * and returns clean display names.
 *
 * @param {Object|string} employee - Employee object or name string
 * @returns {string} - Clean display name (e.g. "janhavi.s" or "Janhavi Samant")
 */
export function getEmployeeDisplayName(employee) {
  if (!employee) return 'Unknown employee';

  let rawName = '';
  let rawEmail = '';
  let rawEmpCode = '';

  if (typeof employee === 'string') {
    rawName = employee.trim();
  } else if (typeof employee === 'object') {
    const fn = (employee.first_name || '').trim();
    const ln = (employee.last_name || '').trim();
    const combined = `${fn} ${ln}`.trim();
    if (combined) {
      rawName = combined;
    } else {
      rawName = (employee.name || '').trim();
    }
    rawEmail = (employee.email || '').trim();
    rawEmpCode = (employee.emp_code || employee.employeeId || '').trim();
  }

  const isDefaultGenericName = Boolean(
    !rawName ||
    rawName.toLowerCase() === 'employee' ||
    rawName.toLowerCase() === 'unknown employee'
  );

  // If rawName contains '@', strip domain and return local part (e.g. "janhavi.s@laesfera.co" -> "janhavi.s")
  if (rawName.includes('@')) {
    const localPart = rawName.split('@')[0].trim();
    if (localPart) return localPart;
  }

  // Check if rawName is an Employee Code (e.g. "101", "EMP001") or purely numeric
  const isCodePattern = Boolean(rawEmpCode && rawName.toLowerCase() === rawEmpCode.toLowerCase());
  const isPureNumber = /^\d+$/.test(rawName);

  if ((isCodePattern || isPureNumber || isDefaultGenericName) && rawEmail) {
    const localPart = rawEmail.split('@')[0].trim();
    if (localPart) return localPart;
    return rawEmail;
  }

  if (isDefaultGenericName) {
    // Try localStorage email or user_name
    try {
      const storedEmail =
        localStorage.getItem('loginEmail') ||
        localStorage.getItem('rememberedLoginEmail') ||
        localStorage.getItem('email');
      if (storedEmail && storedEmail.includes('@')) {
        return storedEmail.split('@')[0].trim();
      }
      const storedUserName = localStorage.getItem('user_name');
      if (storedUserName && storedUserName.toLowerCase() !== 'employee') {
        if (storedUserName.includes('@')) return storedUserName.split('@')[0].trim();
        return storedUserName.trim();
      }
    } catch {}
    return 'Employee';
  }

  if (!rawName || isCodePattern || isPureNumber) {
    if (rawEmail) {
      return rawEmail.split('@')[0].trim() || rawEmail;
    }
    return rawEmpCode || 'Unknown employee';
  }

  // Case-insensitive check: if name and email are identical
  if (rawEmail && rawName.toLowerCase() === rawEmail.toLowerCase()) {
    return rawEmail.split('@')[0].trim() || rawEmail;
  }

  // Check if rawName contains repeated parts (e.g. "janhavi.s@laesfera.co janhavi.s@laesfera.co")
  const nameParts = rawName.split(/\s+/);
  if (nameParts.length === 2 && nameParts[0].toLowerCase() === nameParts[1].toLowerCase()) {
    if (nameParts[0].includes('@')) {
      return nameParts[0].split('@')[0].trim();
    }
    return nameParts[0];
  }

  return rawName;
}

/**
 * Returns avatar initials for an employee.
 *
 * @param {string} name - Employee name
 * @param {string} email - Employee email
 * @returns {string} - Initials (1-2 uppercase letters)
 */
export function getInitials(name, email) {
  const displayName = getEmployeeDisplayName({ name, email });
  if (!displayName || displayName === 'Unknown employee') return 'EM';

  if (displayName.includes('@')) {
    const localPart = displayName.split('@')[0];
    const parts = localPart.split(/[._\-\s]+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return localPart.slice(0, 2).toUpperCase() || 'EM';
  }

  const parts = displayName.trim().split(/[._\-\s]+/);
  const first = parts[0] ? parts[0][0] : '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : parts[0].length > 1 ? parts[0][1] : '';
  return (first + last).toUpperCase() || 'EM';
}
