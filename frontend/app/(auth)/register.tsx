import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { registerOfficer, loginOfficer } from '../../services/authService';

export default function RegisterScreen() {
  const [officerId, setOfficerId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!officerId || !name || !email || !password || !confirm) {
      Alert.alert('Error', 'All fields required');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      // Register the officer
      await registerOfficer(officerId, name, email, password);
      
      // Auto-login after successful registration
      const officer = await loginOfficer(email, password);
      console.log('Auto-login successful:', officer);
      
      Alert.alert('Success', 'Account created and logged in!');
      router.replace('/(officer)/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}> Register Officer</Text>
        <Text style={styles.subtitle}>Create master account</Text>

        <TextInput
          style={styles.input}
          placeholder="Officer ID"
          value={officerId}
          onChangeText={setOfficerId}
          autoCapitalize="characters"
        />
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />
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
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('./login')}>
          <Text style={styles.loginText}>Already have an account? Login</Text>
        </TouchableOpacity>
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
    fontSize: 28, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    color: '#2c3e50', 
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 14, 
    textAlign: 'center', 
    color: '#7f8c8d', 
    marginBottom: 24 
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
  registerBtn: { 
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
  loginText: { 
    textAlign: 'center', 
    marginTop: 20, 
    color: '#3498db', 
    fontSize: 14 
  },
});