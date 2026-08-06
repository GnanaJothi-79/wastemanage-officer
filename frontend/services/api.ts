// services/api.ts

// Replace with your computer's local IP address
const YOUR_COMPUTER_IP = "10.84.17.135";

// For Android emulator (uses host machine's localhost)
const ANDROID_EMULATOR_URL = "http://10.0.2.2:8000";

// For iOS simulator (uses localhost)
const IOS_SIMULATOR_URL = "http://localhost:8000";

// For physical device (use your computer's IP)
const PHYSICAL_DEVICE_URL = `http://${YOUR_COMPUTER_IP}:8000`;

// Export a single API_BASE variable
export const API_BASE = "https://smart-waste-backend-uggt.onrender.com";