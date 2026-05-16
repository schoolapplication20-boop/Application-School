import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

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

const Stack = createNativeStackNavigator();

const headerBlue  = { headerStyle: { backgroundColor: '#2563eb' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } };
const headerGreen = { headerStyle: { backgroundColor: '#059669' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } };

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
    <NavigationContainer>
      {!user && <AuthStack />}
      {user?.role === 'STUDENT' && <StudentStack />}
      {user?.role === 'TEACHER' && <TeacherStack />}
    </NavigationContainer>
  );
}
