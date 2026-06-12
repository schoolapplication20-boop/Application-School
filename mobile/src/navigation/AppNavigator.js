import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { navigationRef } from './navigationRef';
import { handleInitialNotification } from '../services/pushNotifications';

import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

import StudentDashboard from '../screens/student/StudentDashboard';
import StudentAttendance from '../screens/student/StudentAttendance';
import StudentTimetable from '../screens/student/StudentTimetable';
import StudentAssignments from '../screens/student/StudentAssignments';
import StudentExams from '../screens/student/StudentExams';
import StudentFees from '../screens/student/StudentFees';
import StudentDiary from '../screens/student/StudentDiary';
import StudentMessages from '../screens/student/StudentMessages';
import StudentLeave from '../screens/student/StudentLeave';
import StudentMarks from '../screens/student/StudentMarks';

import TeacherDashboard from '../screens/teacher/TeacherDashboard';
import TeacherAttendance from '../screens/teacher/TeacherAttendance';
import TeacherAssignments from '../screens/teacher/TeacherAssignments';
import TeacherDiary from '../screens/teacher/TeacherDiary';
import TeacherMarks from '../screens/teacher/TeacherMarks';
import TeacherSchedule from '../screens/teacher/TeacherSchedule';
import TeacherMessages from '../screens/teacher/TeacherMessages';
import TeacherLeave from '../screens/teacher/TeacherLeave';
import TeacherExams from '../screens/teacher/TeacherExams';
import TeacherLeaveApproval from '../screens/teacher/TeacherLeaveApproval';

import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminStudents from '../screens/admin/AdminStudents';
import AdminAttendanceReport from '../screens/admin/AdminAttendanceReport';
import AdminLeaveManagement from '../screens/admin/AdminLeaveManagement';
import AdminCollectFee from '../screens/admin/AdminCollectFee';
import AdminMessages from '../screens/admin/AdminMessages';
import AdminApplications from '../screens/admin/AdminApplications';
import AdminTeacherAttendance from '../screens/admin/AdminTeacherAttendance';

import SuperAdminDashboard from '../screens/superadmin/SuperAdminDashboard';
import AdminManagement from '../screens/superadmin/AdminManagement';
import DiaryMonitoring from '../screens/superadmin/DiaryMonitoring';
import TransportDashboard from '../screens/superadmin/TransportDashboard';

const Stack = createNativeStackNavigator();

const headerBlue   = { headerStyle: { backgroundColor: '#2563eb' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } };
const headerGreen  = { headerStyle: { backgroundColor: '#059669' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } };
const headerPurple = { headerStyle: { backgroundColor: '#7c3aed' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } };
const headerIndigo = { headerStyle: { backgroundColor: '#4338ca' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } };

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function StudentStack() {
  return (
    <Stack.Navigator screenOptions={headerBlue}>
      <Stack.Screen name="StudentDashboard" component={StudentDashboard} options={{ headerShown: false }} />
      <Stack.Screen name="StudentAttendance" component={StudentAttendance} options={{ title: 'My Attendance' }} />
      <Stack.Screen name="StudentTimetable" component={StudentTimetable} options={{ title: 'Class Schedule' }} />
      <Stack.Screen name="StudentAssignments" component={StudentAssignments} options={{ title: 'Assignments' }} />
      <Stack.Screen name="StudentExams" component={StudentExams} options={{ title: 'Exam Schedule' }} />
      <Stack.Screen name="StudentFees" component={StudentFees} options={{ title: 'Fee Details' }} />
      <Stack.Screen name="StudentDiary" component={StudentDiary} options={{ title: 'Class Diary' }} />
      <Stack.Screen name="StudentMessages" component={StudentMessages} options={{ title: 'Messages' }} />
      <Stack.Screen name="StudentLeave" component={StudentLeave} options={{ title: 'Leave Request' }} />
      <Stack.Screen name="StudentMarks" component={StudentMarks} options={{ title: 'My Marks' }} />
    </Stack.Navigator>
  );
}

function TeacherStack() {
  return (
    <Stack.Navigator screenOptions={headerGreen}>
      <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} options={{ headerShown: false }} />
      <Stack.Screen name="TeacherAttendance" component={TeacherAttendance} options={{ title: 'Mark Attendance' }} />
      <Stack.Screen name="TeacherAssignments" component={TeacherAssignments} options={{ title: 'Assignments' }} />
      <Stack.Screen name="TeacherDiary" component={TeacherDiary} options={{ title: 'Class Diary' }} />
      <Stack.Screen name="TeacherMarks" component={TeacherMarks} options={{ title: 'Enter Marks' }} />
      <Stack.Screen name="TeacherSchedule" component={TeacherSchedule} options={{ title: 'My Schedule' }} />
      <Stack.Screen name="TeacherMessages" component={TeacherMessages} options={{ title: 'Messages' }} />
      <Stack.Screen name="TeacherLeave" component={TeacherLeave} options={{ title: 'Leave Request' }} />
      <Stack.Screen name="TeacherExams" component={TeacherExams} options={{ title: 'Exam Schedule' }} />
      <Stack.Screen name="TeacherLeaveApproval" component={TeacherLeaveApproval} options={{ title: 'Student Leave Approvals' }} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={headerPurple}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ headerShown: false }} />
      <Stack.Screen name="AdminStudents" component={AdminStudents} options={{ title: 'Students' }} />
      <Stack.Screen name="AdminAttendanceReport" component={AdminAttendanceReport} options={{ title: 'Attendance Report' }} />
      <Stack.Screen name="AdminLeaveManagement" component={AdminLeaveManagement} options={{ title: 'Leave Management' }} />
      <Stack.Screen name="AdminCollectFee" component={AdminCollectFee} options={{ title: 'Collect Fee' }} />
      <Stack.Screen name="AdminMessages" component={AdminMessages} options={{ title: 'Messages' }} />
      <Stack.Screen name="AdminApplications" component={AdminApplications} options={{ title: 'Admissions' }} />
      <Stack.Screen name="AdminTeacherAttendance" component={AdminTeacherAttendance} options={{ title: 'Teacher Attendance' }} />
    </Stack.Navigator>
  );
}

function SuperAdminStack() {
  return (
    <Stack.Navigator screenOptions={headerIndigo}>
      <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboard} options={{ headerShown: false }} />
      <Stack.Screen name="AdminManagement" component={AdminManagement} options={{ title: 'Admin Management' }} />
      <Stack.Screen name="DiaryMonitoring" component={DiaryMonitoring} options={{ title: 'Diary Monitoring' }} />
      <Stack.Screen name="TransportDashboard" component={TransportDashboard} options={{ title: 'Transport Dashboard' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={handleInitialNotification}>
      {!user && <AuthStack />}
      {user?.role === 'STUDENT' && <StudentStack />}
      {user?.role === 'TEACHER' && <TeacherStack />}
      {user?.role === 'ADMIN' && <AdminStack />}
      {user?.role === 'SUPER_ADMIN' && <SuperAdminStack />}
    </NavigationContainer>
  );
}
