import { NavLink, Outlet } from 'react-router-dom';
import { Bell, UserCog, CalendarDays, ClipboardList, Clock3, FileText, LayoutDashboard, LayoutGrid, LogOut, Menu, Users, Video, Building2, UserRoundCheck, GraduationCap, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const nav = {
  admin: [
    ['/admin','Dashboard',LayoutDashboard], ['/admin/students','Students',Users], ['/admin/staff','Staff Members',Users],
    ['/admin/departments','Departments',Building2], ['/admin/academics','Academic Credentials',GraduationCap], ['/admin/timings','Period Timings',Clock3], ['/admin/timetable','Class Timetable',CalendarDays],
    ['/admin/staff-timetable','Staff Timetable',LayoutGrid], ['/admin/venues','Venues',Building2],
    ['/admin/leaves','HOD Leaves',FileText], ['/admin/profile-requests','Profile Requests',UserCog], ['/admin/reports','Reports',FileText], ['/admin/notifications','Notifications',Bell], ['/admin/profile','My Profile',UserCog]
  ],
  student: [
    ['/student','Dashboard',LayoutDashboard], ['/student/attendance','Attendance',UserRoundCheck], ['/student/academics','Academic Records',GraduationCap], ['/student/subjects','Subject-wise',ClipboardList],
    ['/student/timetable','Class Timetable',CalendarDays], ['/student/od','Apply OD',ClipboardList], ['/student/leave','Apply Leave',FileText],
    ['/student/reports','Download Report',FileText], ['/student/notifications','Notifications',Bell], ['/student/profile','My Profile',UserCog]
  ]
};

// Three kinds of staff: HOD, Class Advisor and regular Staff. Only HODs and class advisors review student OD requests.
export function staffType(user){ return user?.is_hod ? 'HOD' : user?.is_class_advisor ? 'Class Advisor' : 'Staff'; }
function staffNav(user){
  const reviewer = user?.is_hod || user?.is_class_advisor;
  return [
    ['/staff','Dashboard',LayoutDashboard], ['/staff/attendance','Take Attendance',Video], ['/staff/academics','Academics & Marks',GraduationCap], ['/staff/present','Present List',UserRoundCheck],
    ['/staff/absent','Absent List',Users], ['/staff/timetable','My Timetable',CalendarDays], ['/staff/class-timetable','Class Timetable',LayoutGrid],
    ...(reviewer ? [['/staff/od','Student OD',ClipboardList]] : []),
    ['/staff/leaves', reviewer ? 'Leave / Approvals' : 'My Leave', FileText], ['/staff/modify','Modify Attendance',ClipboardList],
    ['/staff/reports','Reports',FileText], ['/staff/notifications','Notifications',Bell], ['/staff/profile','My Profile',UserCog]
  ];
}

export default function Layout(){
  const {user,logout}=useAuth(); const [open,setOpen]=useState(false);
  return <div className="app">
    <aside className={open?'sidebar open':'sidebar'}>
      <div className="brand"><div className="logo">AI</div><div><b>AI Attendance</b><small>Management System</small></div><button className="sidebar-close" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <nav>{(user?.role==='staff'?staffNav(user):(nav[user?.role]||[])).map(([to,label,Icon])=><NavLink key={to} to={to} end={to==='/'+user.role} onClick={()=>setOpen(false)} className={({isActive})=>isActive?'active':''}><Icon size={18}/>{label}</NavLink>)}</nav>
      <button className="logout" onClick={logout}><LogOut size={18}/>Logout</button>
    </aside>
    <main className="main"><header><button className="mobile" onClick={()=>setOpen(!open)}><Menu/></button><div><span className="eyebrow">{user?.role?.toUpperCase()} PORTAL</span><h2>{user?.role==='admin'?'Administrator':user?.role==='staff'?staffType(user):'Student'} Workspace</h2></div><div className="header-right"><div className="header-college">Sri Shakthi Institute of Engineering and Technology</div><div className="avatar" title={user?.name}>{user?.name?.[0]||'U'}</div><button type="button" className="logout-top" onClick={logout} title="Log out"><LogOut size={16}/><span>Logout</span></button></div></header><section className="content"><Outlet/></section></main>
  </div>;
}
