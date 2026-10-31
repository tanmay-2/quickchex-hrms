// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - AVATARUTILS.JS
// Path: Frontend/hrms-frontend/src/utils/avatarUtils.js
// Purpose: Utility helper functions and formatting routines for 'avatarUtils'.
// ==============================================================================

import { getApiUrl } from '../services/apiClient';

/**
 * Resolves a dynamic profile image URL to a clean, fully-qualified or proxyable URL.
 * Returns null if no valid image is provided.
 */
export function resolveAvatarUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (
    !trimmed ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === '—' ||
    trimmed === '-' ||
    trimmed === 'None'
  ) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return getApiUrl(cleanPath);
}

/**
 * Extracts and resolves the authenticated user's photo from user objects or localStorage.
 * Personal profile photos disabled across the UI per requirement: returns null so initials are used exclusively.
 */
export function getStoredAvatarUrl(userObj = null) {
  return null;
}
