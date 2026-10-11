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
 */
export function getStoredAvatarUrl(userObj = null) {
  const candidate =
    userObj?.profile_image ||
    userObj?.profileImage ||
    userObj?.avatar ||
    userObj?.avatar_url ||
    userObj?.avatarUrl ||
    userObj?.photo ||
    userObj?.photo_url ||
    userObj?.photoUrl ||
    (() => {
      try {
        const u =
          JSON.parse(localStorage.getItem('user') || 'null') ||
          JSON.parse(localStorage.getItem('userData') || 'null') ||
          JSON.parse(localStorage.getItem('manager_user') || 'null');
        return (
          u?.profile_image ||
          u?.profileImage ||
          u?.avatar ||
          u?.avatar_url ||
          u?.photo ||
          null
        );
      } catch {
        return null;
      }
    })() ||
    localStorage.getItem('profile_image') ||
    localStorage.getItem('photo') ||
    localStorage.getItem('avatar') ||
    null;

  return resolveAvatarUrl(candidate);
}
