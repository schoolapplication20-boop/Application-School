import * as SecureStore from 'expo-secure-store';

// Auth credentials (JWT + user profile) are kept in the platform keychain
// (iOS Keychain / Android Keystore-backed EncryptedSharedPreferences) instead
// of plain AsyncStorage, since they grant full access to the user's account.

export async function getStoredToken() {
  return SecureStore.getItemAsync('token');
}

export async function setStoredToken(token) {
  return SecureStore.setItemAsync('token', token);
}

export async function getStoredUser() {
  const json = await SecureStore.getItemAsync('user');
  return json ? JSON.parse(json) : null;
}

export async function setStoredUser(user) {
  return SecureStore.setItemAsync('user', JSON.stringify(user));
}

export async function clearAuthStorage() {
  await SecureStore.deleteItemAsync('token');
  await SecureStore.deleteItemAsync('user');
}
