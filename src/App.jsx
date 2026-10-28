import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import { Login, Register, Forgot } from './pages/Auth';
import { Admin, Staff, Student } from './pages/Dashboards';
import { ClassTimetable, StaffTimetable, PeriodTimings } from './pages/Timetables';
import { TakeAttendance } from './pages/TakeAttendance';
import { Departments } from './pages/AdminManage';
import { MyProfile, ProfileRequests } from './pages/Profile';
import { Students, Staffs, Venues, OD, Attendance, StudentAttendance, Subjects, ApplyOD, Leaves, Reports, Notifications, Modify } from './pages/Management';
import { StudentAcademics, StaffAcademics, AdminAcademicConfig } from './pages/Academics';

const P=({role,children})=><ProtectedRoute role={role}>{children}</ProtectedRoute>;

export default function App(){return <Routes>
  <Route path="/" element={<Home/>}/><Route path="/login/:role" element={<Login/>}/><Route path="/register/:role" element={<Register/>}/><Route path="/forgot-password" element={<Forgot/>}/>
  <Route element={<Layout/>}>
    <Route path="/admin" element={<P role="admin"><Admin/></P>}/><Route path="/admin/students" element={<P role="admin"><Students/></P>}/><Route path="/admin/staff" element={<P role="admin"><Staffs/></P>}/><Route path="/admin/departments" element={<P role="admin"><Departments/></P>}/><Route path="/admin/timetable" element={<P role="admin"><ClassTimetable/></P>}/><Route path="/admin/staff-timetable" element={<P role="admin"><StaffTimetable/></P>}/><Route path="/admin/timings" element={<P role="admin"><PeriodTimings/></P>}/><Route path="/admin/venues" element={<P role="admin"><Venues/></P>}/><Route path="/admin/academics" element={<P role="admin"><AdminAcademicConfig/></P>}/><Route path="/admin/profile-requests" element={<P role="admin"><ProfileRequests/></P>}/><Route path="/admin/profile" element={<P role="admin"><MyProfile/></P>}/><Route path="/staff/profile" element={<P role="staff"><MyProfile/></P>}/><Route path="/student/profile" element={<P role="student"><MyProfile/></P>}/><Route path="/admin/leaves" element={<P role="admin"><Leaves admin/></P>}/><Route path="/admin/reports" element={<P role="admin"><Reports/></P>}/><Route path="/admin/notifications" element={<P role="admin"><Notifications/></P>}/>
    <Route path="/staff" element={<P role="staff"><Staff/></P>}/><Route path="/staff/attendance" element={<P role="staff"><TakeAttendance/></P>}/><Route path="/staff/academics" element={<P role="staff"><StaffAcademics/></P>}/><Route path="/staff/present" element={<P role="staff"><Attendance status="Present"/></P>}/><Route path="/staff/absent" element={<P role="staff"><Attendance status="Absent"/></P>}/><Route path="/staff/timetable" element={<P role="staff"><StaffTimetable/></P>}/><Route path="/staff/class-timetable" element={<P role="staff"><ClassTimetable/></P>}/><Route path="/staff/od" element={<P role="staff"><OD staff/></P>}/><Route path="/staff/leaves" element={<P role="staff"><Leaves staff/></P>}/><Route path="/staff/modify" element={<P role="staff"><Modify/></P>}/><Route path="/staff/reports" element={<P role="staff"><Reports/></P>}/><Route path="/staff/notifications" element={<P role="staff"><Notifications/></P>}/>
    <Route path="/student" element={<P role="student"><Student/></P>}/><Route path="/student/attendance" element={<P role="student"><StudentAttendance/></P>}/><Route path="/student/academics" element={<P role="student"><StudentAcademics/></P>}/><Route path="/student/subjects" element={<P role="student"><Subjects/></P>}/><Route path="/student/timetable" element={<P role="student"><ClassTimetable student/></P>}/><Route path="/student/od" element={<P role="student"><ApplyOD/></P>}/><Route path="/student/leave" element={<P role="student"><Leaves/></P>}/><Route path="/student/reports" element={<P role="student"><Reports/></P>}/><Route path="/student/notifications" element={<P role="student"><Notifications/></P>}/>
  </Route><Route path="*" element={<Navigate to="/"/>}/>
</Routes>}
