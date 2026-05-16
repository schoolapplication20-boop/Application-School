import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { scale, fontScale } from '../../utils/responsive';

const ROLES = [
  { key: 'STUDENT', label: 'Student', icon: '🎓' },
  { key: 'TEACHER', label: 'Teacher', icon: '👨‍🏫' },
];

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
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
    <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e40af' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: scale(20) },
  header: { alignItems: 'center', marginBottom: scale(24) },
  logo: { fontSize: fontScale(30), fontWeight: '900', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: fontScale(13), color: '#bfdbfe', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: scale(20), padding: scale(22), elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16 },
  cardTitle: { fontSize: fontScale(21), fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  cardSub: { fontSize: fontScale(13), color: '#64748b', marginBottom: scale(18) },
  roleRow: { flexDirection: 'row', gap: scale(12), marginBottom: scale(18) },
  roleBtn: { flex: 1, borderWidth: 2, borderColor: '#e2e8f0', borderRadius: scale(14), paddingVertical: scale(14), alignItems: 'center', backgroundColor: '#f8fafc' },
  roleBtnActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  roleIcon: { fontSize: fontScale(26), marginBottom: 6 },
  roleLabel: { fontSize: fontScale(13), fontWeight: '600', color: '#94a3b8' },
  roleLabelActive: { color: '#2563eb' },
  label: { fontSize: fontScale(13), fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: scale(13), fontSize: fontScale(14), marginBottom: scale(12), backgroundColor: '#f8fafc', color: '#1e293b' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(12), gap: 8 },
  eyeBtn: { padding: scale(13), borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#f8fafc' },
  eyeIcon: { fontSize: fontScale(16) },
  button: { backgroundColor: '#2563eb', borderRadius: 12, padding: scale(14), alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: fontScale(16) },
  forgotLink: { alignItems: 'center', marginTop: scale(14) },
  forgotText: { fontSize: fontScale(13), color: '#2563eb', fontWeight: '600' },
});
