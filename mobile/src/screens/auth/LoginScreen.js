import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ROLES = [
  { key: 'STUDENT', label: 'Student', icon: '🎓' },
  { key: 'TEACHER', label: 'Teacher', icon: '👨‍🏫' },
];

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isStudent = selectedRole === 'STUDENT';

  const handleLogin = async () => {
    if (!selectedRole) { Alert.alert('Error', 'Please select your role.'); return; }
    if (!identifier.trim()) { Alert.alert('Error', isStudent ? 'Enter your admission number.' : 'Enter your email.'); return; }
    if (!password.trim()) { Alert.alert('Error', 'Enter your password.'); return; }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', {
        email: identifier.trim().toLowerCase(),
        password,
        selectedRole,
      });
      const { token, user } = res.data.data;

      if (user.role !== selectedRole) {
        Alert.alert('Access Denied', 'You do not have permission for the selected role.');
        return;
      }

      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        firstLogin: user.firstLogin,
      };

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      login(userData);
    } catch (err) {
      Alert.alert('Login Failed', err?.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>My-Skoolz</Text>
          <Text style={styles.tagline}>Smart School Management</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSub}>Choose your role to continue</Text>

          <View style={styles.roleRow}>
            {ROLES.map(role => (
              <TouchableOpacity
                key={role.key}
                style={[styles.roleBtn, selectedRole === role.key && styles.roleBtnActive]}
                onPress={() => { setSelectedRole(role.key); setIdentifier(''); }}
              >
                <Text style={styles.roleIcon}>{role.icon}</Text>
                <Text style={[styles.roleLabel, selectedRole === role.key && styles.roleLabelActive]}>
                  {role.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedRole !== '' && (
            <>
              <Text style={styles.label}>{isStudent ? 'Admission Number' : 'Email'}</Text>
              <TextInput
                style={styles.input}
                placeholder={isStudent ? 'Enter admission number' : 'Enter email address'}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType={isStudent ? 'default' : 'email-address'}
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Enter password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>Sign In</Text>
                }
              </TouchableOpacity>

              {selectedRole === 'TEACHER' && (
                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e40af' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 13, color: '#bfdbfe', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleBtn: { flex: 1, borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: '#f8fafc' },
  roleBtnActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  roleIcon: { fontSize: 28, marginBottom: 6 },
  roleLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  roleLabelActive: { color: '#2563eb' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 13, fontSize: 14, marginBottom: 14, backgroundColor: '#f8fafc', color: '#1e293b' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  eyeBtn: { padding: 13, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#f8fafc' },
  eyeIcon: { fontSize: 16 },
  button: { backgroundColor: '#2563eb', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  forgotLink: { alignItems: 'center', marginTop: 14 },
  forgotText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
});
