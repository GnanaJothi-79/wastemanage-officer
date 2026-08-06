import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { loginOfficer } from '../../services/authService';
import { API_BASE } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<'officer' | 'worker'>('officer');

  // Worker login function
  const loginWorker = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/workers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Invalid worker credentials');
    }

    const worker = await response.json();
    await AsyncStorage.setItem('worker', JSON.stringify(worker));
    return worker;
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      if (loginType === 'officer') {
        // Officer login
        const officer = await loginOfficer(email, password);
        setLoading(false);
        router.replace('/(officer)/dashboard');
      } else {
        // Worker login
        const worker = await loginWorker(email, password);
        setLoading(false);
        router.replace('/(workermod)/dashboard');
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    }
  };

  const goToRegister = () => {
    router.push('./register');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Smart Waste</Text>
        
        {/* Role Selection Tabs */}
        <View style={styles.roleTabs}>
          <TouchableOpacity
            style={[styles.roleTab, loginType === 'officer' && styles.activeRoleTab]}
            onPress={() => setLoginType('officer')}
          >
            <Text style={[styles.roleText, loginType === 'officer' && styles.activeRoleText]}>
              👮 Officer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleTab, loginType === 'worker' && styles.activeRoleTab]}
            onPress={() => setLoginType('worker')}
          >
            <Text style={[styles.roleText, loginType === 'worker' && styles.activeRoleText]}>
              🧹 Worker
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          {loginType === 'officer' ? 'Officer Login' : 'Worker Login'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Login</Text>}
        </TouchableOpacity>

        {/* Always show register link for officer */}
        {loginType === 'officer' && (
          <TouchableOpacity onPress={goToRegister}>
            <Text style={styles.registerText}>🔐 Register new officer account</Text>
          </TouchableOpacity>
        )}

        {loginType === 'worker' && (
          <Text style={styles.workerHint}>
            Contact your officer for worker credentials
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f0f4f7' 
  },
  card: { 
    width: '85%', 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 28, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 6 
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    color: '#2c3e50', 
    marginBottom: 8 
  },
  roleTabs: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 30,
    padding: 4,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 26,
    alignItems: 'center',
  },
  activeRoleTab: {
    backgroundColor: '#2ecc71',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  activeRoleText: {
    color: '#fff',
  },
  subtitle: { 
    fontSize: 18, 
    textAlign: 'center', 
    color: '#7f8c8d', 
    marginBottom: 28 
  },
  input: { 
    height: 50, 
    backgroundColor: '#f8f9fa', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    marginVertical: 8, 
    fontSize: 16, 
    borderWidth: 1, 
    borderColor: '#e0e0e0' 
  },
  loginBtn: { 
    backgroundColor: '#2ecc71', 
    borderRadius: 12, 
    paddingVertical: 14, 
    alignItems: 'center', 
    marginTop: 16 
  },
  btnText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 18 
  },
  registerText: { 
    textAlign: 'center', 
    marginTop: 20, 
    color: '#3498db', 
    fontSize: 14,
    fontWeight: '500'
  },
  workerHint: {
    textAlign: 'center',
    marginTop: 20,
    color: '#95a5a6',
    fontSize: 12,
  },
});