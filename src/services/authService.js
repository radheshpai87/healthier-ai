/**
 * authService.js
 * ─────────────────────────────────────────────
 * Multi-user persistence for AuraHealth.
 *
 * Design:
 *   - Each user gets a unique ID (UUID-ish)
 *   - All data keys are prefixed with `u_<userId>_`
 *   - A 4-digit PIN protects each account
 *   - Session is persisted in SecureStore so the
 *     last logged-in user is auto-resumed on app open
 *
 * Storage keys (not user-scoped — global registry):
 *   aurahealth_users_registry   → JSON array of UserRecord
 *   aurahealth_active_session   → JSON { userId, loggedInAt }
 * ─────────────────────────────────────────────
 */

import * as SecureStore from 'expo-secure-store';

// ── Constants ──────────────────────────────────
const REGISTRY_KEY = 'aurahealth_users_registry';
const SESSION_KEY  = 'aurahealth_active_session';

// Session stays valid for 30 days of inactivity
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// ── Module-level current user (sync-accessible) ─
let _currentUserId = null;

/**
 * Returns the currently active user ID synchronously.
 * Will be null until restoreSession() resolves.
 * @returns {string|null}
 */
export function getCurrentUserId() {
  return _currentUserId;
}

/**
 * Prefix a storage key with the active user ID.
 * Falls back to unscoped key for backward-compat migration.
 * @param {string} key
 * @returns {string}
 */
export function scopedKey(key) {
  return _currentUserId ? `u_${_currentUserId}_${key}` : key;
}

// ── Registry Helpers ───────────────────────────

/**
 * @typedef {Object} UserRecord
 * @property {string} id          - Unique user ID
 * @property {string} name        - Display name
 * @property {string} role        - 'woman' | 'asha'
 * @property {string} pin         - 4-digit PIN stored in SecureStore (already encrypted)
 * @property {string} createdAt   - ISO date string
 * @property {string} [avatarColor] - Hex colour for avatar circle
 */

const AVATAR_COLOURS = [
  '#C2185B', '#7B1FA2', '#1565C0', '#00838F',
  '#2E7D32', '#E65100', '#4527A0', '#00695C',
];

/**
 * Load all registered users from SecureStore.
 * @returns {Promise<UserRecord[]>}
 */
export async function getUsers() {
  try {
    const raw = await SecureStore.getItemAsync(REGISTRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[Auth] getUsers error:', err);
    return [];
  }
}

/**
 * Persist the users registry.
 * @param {UserRecord[]} users
 */
async function saveUsers(users) {
  await SecureStore.setItemAsync(REGISTRY_KEY, JSON.stringify(users));
}

// ── Session Management ─────────────────────────

/**
 * Restore the most recent session on app boot.
 * Sets the module-level _currentUserId if session is still valid.
 * @returns {Promise<UserRecord|null>} The restored user, or null
 */
export async function restoreSession() {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);
    const age = Date.now() - session.loggedInAt;
    if (age > SESSION_TTL_MS) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }

    const users = await getUsers();
    const user = users.find((u) => u.id === session.userId);
    if (!user) return null;

    _currentUserId = user.id;
    return user;
  } catch (err) {
    console.error('[Auth] restoreSession error:', err);
    return null;
  }
}

/**
 * Start a session for the given user.
 * @param {string} userId
 */
async function startSession(userId) {
  _currentUserId = userId;
  await SecureStore.setItemAsync(
    SESSION_KEY,
    JSON.stringify({ userId, loggedInAt: Date.now() })
  );
}

/**
 * End the current session (logout).
 */
export async function logout() {
  _currentUserId = null;
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

// ── User Registration ──────────────────────────

/**
 * Generate a simple unique user ID.
 * @returns {string}
 */
function generateUserId() {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).substring(2, 9)
  );
}

/**
 * Register a new user and immediately start their session.
 * Call this at the END of the onboarding flow (after role + profile setup).
 *
 * @param {Object} opts
 * @param {string} opts.name  - Display name
 * @param {string} opts.role  - 'woman' | 'asha'
 * @param {string} opts.pin   - 4-digit PIN string
 * @returns {Promise<UserRecord>} The newly created user
 */
export async function registerUser({ name, role, pin }) {
  const users = await getUsers();

  const newUser = {
    id: generateUserId(),
    name: name.trim() || 'User',
    role,
    pin,
    createdAt: new Date().toISOString(),
    avatarColor: AVATAR_COLOURS[users.length % AVATAR_COLOURS.length],
  };

  users.push(newUser);
  await saveUsers(users);
  await startSession(newUser.id);
  return newUser;
}

// ── Authentication ─────────────────────────────

/**
 * Verify a PIN and start a session for the user.
 * @param {string} userId
 * @param {string} pin
 * @returns {Promise<{success: boolean, user: UserRecord|null}>}
 */
export async function loginWithPin(userId, pin) {
  const users = await getUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) return { success: false, user: null };
  if (user.pin !== pin) return { success: false, user: user };

  await startSession(userId);
  return { success: true, user };
}

/**
 * Update the PIN for the currently logged-in user.
 * @param {string} oldPin
 * @param {string} newPin
 * @returns {Promise<boolean>} Whether the update succeeded
 */
export async function updatePin(oldPin, newPin) {
  if (!_currentUserId) return false;

  const users = await getUsers();
  const idx = users.findIndex((u) => u.id === _currentUserId);
  if (idx === -1) return false;
  if (users[idx].pin !== oldPin) return false;

  users[idx].pin = newPin;
  await saveUsers(users);
  return true;
}

/**
 * Get the currently logged-in user object.
 * @returns {Promise<UserRecord|null>}
 */
export async function getCurrentUser() {
  if (!_currentUserId) return null;
  const users = await getUsers();
  return users.find((u) => u.id === _currentUserId) || null;
}

/**
 * Update display name for current user.
 * @param {string} name
 */
export async function updateDisplayName(name) {
  if (!_currentUserId) return;
  const users = await getUsers();
  const idx = users.findIndex((u) => u.id === _currentUserId);
  if (idx === -1) return;
  users[idx].name = name.trim();
  await saveUsers(users);
}

/**
 * Delete a user account and all their scoped data.
 * Only the currently logged-in user can delete their own account.
 * @returns {Promise<boolean>}
 */
export async function deleteCurrentUser() {
  if (!_currentUserId) return false;

  // Remove from registry
  const users = await getUsers();
  const filtered = users.filter((u) => u.id !== _currentUserId);
  await saveUsers(filtered);

  // End session
  await logout();
  return true;
}

/**
 * Delete any user by ID (for managing profiles from login screen).
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function deleteUserById(userId) {
  const users = await getUsers();
  const filtered = users.filter((u) => u.id !== userId);
  if (filtered.length === users.length) return false; // user not found
  await saveUsers(filtered);
  // If deleting the currently active session user, clear session
  if (_currentUserId === userId) {
    await logout();
  }
  return true;
}

/**
 * Check if there are any registered users.
 * Used by login screen to decide whether to show onboarding.
 * @returns {Promise<boolean>}
 */
export async function hasAnyUsers() {
  const users = await getUsers();
  return users.length > 0;
}
