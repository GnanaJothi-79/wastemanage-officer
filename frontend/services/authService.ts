import { API_BASE } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Officer {
  officer_id: string;
  name: string;
  email: string;
}


// Check if any officer exists in the database
export const isOfficerRegistered = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/auth/check-exists`);
    if (!response.ok) {
      console.warn('Failed to check officer existence:', response.status);
      return false;
    }
    const data = await response.json();
    return data.exists === true;
  } catch (error) {
    console.error('Error checking officer existence:', error);
    return false;
  }
};

// Register a new officer
export const registerOfficer = async (officerId: string, name: string, email: string, password: string) => {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officer_id: officerId, name, email, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Registration failed');
  }
  
  const data = await response.json();
  return data;
};

// Login officer
export const loginOfficer = async (email: string, password: string): Promise<Officer> => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Invalid credentials');
  }
  
  const data = await response.json();
  
  const officer: Officer = {
    officer_id: data.officer_id,
    name: data.name || email.split('@')[0],
    email: email
  };
  
  await AsyncStorage.setItem('officer', JSON.stringify(officer));
  return officer;
};

// Get current logged-in officer
export const getCurrentOfficer = async (): Promise<Officer | null> => {
  const data = await AsyncStorage.getItem('officer');
  if (!data) return null;
  
  try {
    return JSON.parse(data) as Officer;
  } catch {
    return null;
  }
};

// Logout
export const logoutOfficer = async () => {
  await AsyncStorage.removeItem('officer');
};