import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { scale, fontScale, W } from '../../utils/responsive';

const OTP_BOX_SIZE = Math.floor((W - scale(48) - 5 * scale(8)) / 6);

const STEP = { EMAIL: 'EMAIL', OTP: 'OTP', PASSWORD: 'PASSWORD' };
const OTP_EXPIRY = 300;

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(STEP.EMAIL);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(OTP_EXPIRY);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (step !== STEP.OTP) return;
    if (timer <= 0) { setCanResend(true); return; }
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [step, timer]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const sendOtp = async () => {
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { identifier: identifier.trim().toLowerCase() });
      setTimer(OTP_EXPIRY);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      setStep(STEP.OTP);
      setTimeout(() => inputRefs.current[0]?.focus(), 200);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Email not registered. Please contact admin.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) { Alert.alert('Error', 'Please enter the complete 6-digit OTP.'); return; }
    setLoading(true);
    try {
      await api.post('/api/auth/verify-otp', { identifier: identifier.trim().toLowerCase(), otp: code });
      setStep(STEP.PASSWORD);
    } catch (err) {
      Alert.alert('Invalid OTP', err?.response?.data?.message || 'OTP is incorrect or expired.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', {
        identifier: identifier.trim().toLowerCase(),
        newPassword,
      });
      Alert.alert('Success', 'Password reset successfully. Please log in.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKey = (index, key) => {
    if (key === 'Backspace') {
      const next = [...otp];
      if (!next[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      next[index] = '';
      setOtp(next);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.logo}>My-Skoolz</Text>
          <Text style={styles.tagline}>Reset your password</Text>
        </View>

        <View style={styles.card}>
          {/* Step indicators */}
          <View style={styles.steps}>
            {[STEP.EMAIL, STEP.OTP, STEP.PASSWORD].map((s, i) => (
              <View key={s} style={styles.stepItem}>
                <View style={[styles.stepDot, step === s && styles.stepDotActive,
                  (step === STEP.OTP && i === 0) || (step === STEP.PASSWORD && i <= 1) ? styles.stepDotDone : null]}>
                  <Text style={[styles.stepNum,
                    (step === STEP.OTP && i === 0) || (step === STEP.PASSWORD && i <= 1) ? styles.stepNumDone : null,
                    step === s ? styles.stepNumActive : null]}>
                    {(step === STEP.OTP && i === 0) || (step === STEP.PASSWORD && i <= 1) ? '✓' : i + 1}
                  </Text>
                </View>
                {i < 2 && <View style={[styles.stepLine, (step === STEP.OTP && i === 0) || (step === STEP.PASSWORD && i <= 1) ? styles.stepLineDone : null]} />}
              </View>
            ))}
          </View>

          {/* STEP 1: Email */}
          {step === STEP.EMAIL && (
            <>
              <Text style={styles.stepTitle}>Enter your email</Text>
              <Text style={styles.stepDesc}>We'll send a 6-digit OTP to reset your password.</Text>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={sendOtp}
                disabled={loading || !identifier.trim()}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* STEP 2: OTP */}
          {step === STEP.OTP && (
            <>
              <Text style={styles.stepTitle}>Enter OTP</Text>
              <Text style={styles.stepDesc}>A 6-digit code was sent to{'\n'}<Text style={styles.identifierHighlight}>{identifier}</Text></Text>
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={r => inputRefs.current[i] = r}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={v => handleOtpChange(i, v)}
                    onKeyPress={({ nativeEvent }) => handleOtpKey(i, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <View style={styles.timerRow}>
                {canResend ? (
                  <TouchableOpacity onPress={sendOtp}>
                    <Text style={styles.resendText}>Resend OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.timerText}>Resend in <Text style={styles.timerVal}>{formatTime(timer)}</Text></Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={verifyOtp}
                disabled={loading || otp.join('').length < 6}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* STEP 3: New Password */}
          {step === STEP.PASSWORD && (
            <>
              <Text style={styles.stepTitle}>Set new password</Text>
              <Text style={styles.stepDesc}>Choose a strong password for your account.</Text>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPwd}
                  autoFocus
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(!showPwd)}>
                  <Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.label, { marginTop: 14 }]}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPwd}
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={resetPassword}
                disabled={loading || !newPassword || !confirmPassword}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e40af' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 13, color: '#bfdbfe', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16 },

  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  stepDotDone: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  stepNum: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  stepNumActive: { color: '#2563eb' },
  stepNumDone: { color: '#fff' },
  stepLine: { width: 36, height: 2, backgroundColor: '#e2e8f0', marginHorizontal: 4 },
  stepLineDone: { backgroundColor: '#2563eb' },

  stepTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  stepDesc: { fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 18 },
  identifierHighlight: { color: '#2563eb', fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 13, fontSize: 14, marginBottom: 14, backgroundColor: '#f8fafc', color: '#1e293b' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 13, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#f8fafc' },
  eyeIcon: { fontSize: 16 },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  otpBox: { width: OTP_BOX_SIZE, height: OTP_BOX_SIZE + 6, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, textAlign: 'center', fontSize: fontScale(20), fontWeight: '700', color: '#1e293b', backgroundColor: '#f8fafc' },
  otpBoxFilled: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },

  timerRow: { alignItems: 'center', marginBottom: 16 },
  timerText: { fontSize: 13, color: '#94a3b8' },
  timerVal: { color: '#ef4444', fontWeight: '700' },
  resendText: { fontSize: 14, color: '#2563eb', fontWeight: '700' },

  button: { backgroundColor: '#2563eb', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  backLink: { marginTop: 20, alignItems: 'center' },
  backText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
});
