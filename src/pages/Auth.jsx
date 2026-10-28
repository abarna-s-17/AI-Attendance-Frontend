import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Select, Alert, Card, PasswordInput } from '../components/UI';
import FaceScanner from '../components/FaceScanner';

const DEMO_ACCOUNTS = {
  admin: [{ label: 'Administrator', email: 'admin@college.edu', password: 'Admin@123' }],
  staff: [
    { label: 'HOD', email: 'hod@college.edu', password: 'Hod@123' },
    { label: 'Class Advisor', email: 'advisor@college.edu', password: 'Staff@123' },
    { label: 'Staff', email: 'staff@college.edu', password: 'Staff@123' },
  ],
  student: [{ label: 'Student', email: 'student@college.edu', password: 'Student@123' }],
};
const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO !== 'false';

export function Login() {
  const { role } = useParams();
  const { login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!DEMO_ACCOUNTS[role]) return <Navigate to="/" replace />;

  const signIn = async (credentials) => {
    setErr(''); setBusy(true);
    try { await login({ ...credentials, role }); nav('/' + role); }
    catch (x) { setErr(errorMessage(x, 'Login failed')); }
    finally { setBusy(false); }
  };
  const submit = (e) => { e.preventDefault(); signIn(f); };
  const useDemo = (account) => { setF({ email: account.email, password: account.password }); signIn(account); };

  return <AuthShell title={`${role[0].toUpperCase() + role.slice(1)} Login`} sub="Sign in to your AI Attendance workspace">
    <form onSubmit={submit}>{err && <Alert>{err}</Alert>}<Input label="Gmail / Email" type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })}/><PasswordInput label="Password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })}/><Button className="full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button></form>
    {SHOW_DEMO && <div className="demo-box"><small>Demo accounts - one click sign in</small><div className="demo-buttons">{DEMO_ACCOUNTS[role].map(a => <Button key={a.email} type="button" variant="ghost" disabled={busy} onClick={() => useDemo(a)}>{a.label}</Button>)}</div></div>}
    <div className="authlinks"><Link to="/login/student">Student</Link><Link to="/login/staff">Staff</Link><Link to="/login/admin">Admin</Link></div>
    {role !== 'admin' && <p className="center">New user? <Link to={'/register/' + role}>Create account</Link></p>}<p className="center"><Link to="/forgot-password">Forgot password?</Link></p>
  </AuthShell>;
}

function AuthShell({ title, sub, children }) {
  return <div className="auth"><div className="authhero"><div className="logo big"><span>AI</span></div><h1>AI Attendance</h1><p>Intelligent attendance, timetable, OD and leave workflow for your college.</p><div className="hero-points"><span>✓ Face recognition</span><span>✓ Real-time attendance</span><span>✓ Multi-level approvals</span></div></div><div className="authcard"><div className="auth-mobile-brand"><div className="landing-logo"><span>AI</span></div><b>AI Attendance</b></div><h2>{title}</h2><p>{sub}</p>{children}</div></div>;
}

export function Register() {
  const { role } = useParams();
  const [deps, setDeps] = useState([]);
  const [f, setF] = useState({ name:'', email:'', password:'', confirm_password:'', register_number:'', staff_id:'', department_id:'', year:'III', section:'A', subjects_handling:'' });
  const [faceFiles, setFaceFiles] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  useEffect(() => { api.get('/departments').then(r => setDeps(r.data.departments)).catch(x => setErr(errorMessage(x, 'Departments could not be loaded.'))); }, []);
  if (role !== 'student' && role !== 'staff') return <Navigate to="/" replace />;
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    if (faceFiles.length < 3) { setErr('Complete the camera face scan before creating the account.'); return; }
    if (f.password !== f.confirm_password) { setErr('The password and the confirm password do not match.'); return; }
    if (!f.department_id) { setErr('Please select your department.'); return; }
    const fd = new FormData();
    Object.entries({ ...f, role }).forEach(([k, v]) => fd.append(k, v));
    faceFiles.forEach(file => fd.append('face_images', file, file.name));
    setBusy(true);
    try { const r = await api.post('/auth/register', fd); setMsg(r.data.message); setTimeout(() => nav('/login/' + role), 2500); }
    catch (x) { setErr(errorMessage(x, 'Registration failed')); }
    finally { setBusy(false); }
  };
  return <AuthShell title={`First-time ${role} registration`} sub="Create your account and complete the camera-based face scan">
    <form onSubmit={submit}>
      {err && <Alert>{err}</Alert>}{msg && <Alert type="success">{msg}</Alert>}
      <div className="grid2"><Input label="Full name" required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><Input label="Gmail / Email" type="email" required value={f.email} onChange={e=>setF({...f,email:e.target.value})}/><PasswordInput label="Password" minLength="6" required value={f.password} onChange={e=>setF({...f,password:e.target.value})}/><PasswordInput label="Confirm password" minLength="6" required value={f.confirm_password} onChange={e=>setF({...f,confirm_password:e.target.value})}/>{role==='student'?<Input label="Register number" required value={f.register_number} onChange={e=>setF({...f,register_number:e.target.value})}/>:<Input label="Staff ID" required value={f.staff_id} onChange={e=>setF({...f,staff_id:e.target.value})}/>}<Select label="Department" required value={f.department_id} onChange={e=>setF({...f,department_id:e.target.value})}><option value="">Select department</option>{deps.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</Select>{role==='student'?<><Select label="Year" value={f.year} onChange={e=>setF({...f,year:e.target.value})}>{['I','II','III','IV'].map(x=><option key={x}>{x}</option>)}</Select><Input label="Section" value={f.section} onChange={e=>setF({...f,section:e.target.value})}/></>:<Input label="Subjects handled" placeholder="AI, DBMS, Networks" value={f.subjects_handling} onChange={e=>setF({...f,subjects_handling:e.target.value})}/>}</div>
      {f.confirm_password && <p className={'pw-match ' + (f.password === f.confirm_password ? 'ok' : 'bad')}>{f.password === f.confirm_password ? '✓ Passwords match' : '✗ Passwords do not match'}</p>}
      <FaceScanner onComplete={setFaceFiles} />
      <Button className="full" disabled={faceFiles.length < 3 || busy || !!msg}>{busy ? 'Creating account… (processing face samples)' : faceFiles.length >= 3 ? 'Create account & save face profile' : 'Complete face scan to continue'}</Button>
    </form><p className="center"><Link to={'/login/'+role}>Already registered? Login</Link></p>
  </AuthShell>;
}

export function Forgot(){return <AuthShell title="Reset password" sub="Password reset is ready for SMTP integration"><Card><p>The backend includes the reset endpoint. Configure Gmail SMTP in <code>backend/.env</code> before enabling production reset emails.</p></Card></AuthShell>}
