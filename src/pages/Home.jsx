import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Camera, CheckCircle2, Shield, Users } from 'lucide-react';

const portals = [
  { role: 'student', title: 'Student', icon: Users, text: 'View attendance, timetable, reports, OD requests and notifications.', tone: 'purple' },
  { role: 'staff', title: 'Staff', icon: Users, text: 'Manage classes, attendance, students, timetable and reports.', tone: 'blue' },
  { role: 'admin', title: 'Administrator', icon: Shield, text: 'Manage students, staff, attendance, analytics and system settings.', tone: 'dark' },
];

export default function Home() {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-brand">
          <div className="landing-logo"><Camera size={25} /></div>
          <div><b>AI Attendance</b><span>Management System</span></div>
        </div>
        <div className="college-brand"><strong>Sri Shakthi Institute of Engineering and Technology</strong><span>Intelligent Attendance Platform</span></div>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="hero-icon"><Camera size={35} /></div>
          <div className="hero-label">AI-POWERED ATTENDANCE</div>
          <h1>Smart Attendance Management<br className="desktop" /> System</h1>
          <p>A centralized platform for managing attendance, students, staff, timetables, reports and AI-based attendance recognition.</p>
        </section>

        <section className="portal-section">
          <h2>Select your portal</h2>
          <p>Choose how you want to continue.</p>
          <div className="portal-grid">
            {portals.map(({ role, title, icon: Icon, text, tone }) => (
              <article className="portal-card" key={role}>
                <div className={`portal-icon ${tone}`}><Icon size={29} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link className={`portal-button ${tone}`} to={`/login/${role}`}>Continue as {title} <ArrowRight size={18} /></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="feature-grid">
          <div className="feature-card"><div className="feature-icon"><CheckCircle2 size={22} /></div><h3>Accurate Attendance</h3><p>AI-assisted attendance recording reduces manual work and duplicate entries.</p></div>
          <div className="feature-card"><div className="feature-icon"><BarChart3 size={22} /></div><h3>Smart Analytics</h3><p>Track attendance trends and generate detailed reports for academic decisions.</p></div>
          <div className="feature-card"><div className="feature-icon"><Shield size={22} /></div><h3>Role-Based Access</h3><p>Separate portals and permissions for students, staff and administrators.</p></div>
        </section>
      </main>

      <footer className="landing-footer">AI Attendance Management System</footer>
    </div>
  );
}
