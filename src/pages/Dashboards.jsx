import { useEffect, useState, useRef } from 'react';
import { Activity, AlertCircle, BarChart3, Building2, CalendarDays, CheckCircle2, ClipboardList, Clock3, Users, UserCheck, Bell, FileText, GraduationCap, RefreshCw, UploadCloud, Download, Eye, FileSpreadsheet } from 'lucide-react';
import { Card, Stat, Page, Button, Select, Table, Input } from '../components/UI';
import api, { errorMessage, downloadMarksheetFile, uploadMarksheetFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function DashboardTop({ title, subtitle }) { return <div className="dashboard-welcome"><div><span className="dashboard-kicker">OVERVIEW</span><h1>{title}</h1><p>{subtitle}</p></div></div>; }
function QuickCard({ to, icon: Icon, title, text }) { return <Link to={to} className="quick-card"><div className="quick-icon"><Icon size={20}/></div><div><b>{title}</b><span>{text}</span></div></Link>; }

export function Admin(){
  const [d,setD]=useState({}),[error,setError]=useState('');
  useEffect(()=>{api.get('/admin/dashboard').then(r=>setD(r.data)).catch(e=>setError(e.response?.data?.message||'Dashboard data could not be loaded.'))},[]);
  return <Page><DashboardTop title="Welcome, Administrator 👋" subtitle="Manage students, staff, departments, venues, timetables and reports from one place."/>{error&&<div className="alert">{error}</div>}<div className="stats"><Stat label="Students" value={d.total_students||0} icon={<Users/>}/><Stat label="Staff" value={d.total_staff||0} icon={<UserCheck/>}/><Stat label="Departments" value={d.total_departments||0} icon={<Building2/>}/><Stat label="Venues" value={d.total_venues||0} icon={<Building2/>}/></div><div className="dashboard-grid mt"><Card><div className="card-title-row"><div><h3>Attendance Overview</h3><p>Current records across the system</p></div><Activity size={20}/></div><div className="mini-bars"><div><span>Present</span><b>{d.attendance?.present||0}</b></div><div><span>Absent</span><b>{d.attendance?.absent||0}</b></div><div><span>OD</span><b>{d.attendance?.od||0}</b></div><div><span>Leave</span><b>{d.attendance?.leave||0}</b></div></div></Card><Card><div className="card-title-row"><div><h3>System Snapshot</h3><p>Keep your master data up to date</p></div><AlertCircle size={20}/></div><div className="action-line"><span>Pending OD</span><b>{d.pending_od||0}</b></div><div className="action-line"><span>Pending leave approvals</span><b>{d.pending_leaves||0}</b></div><div className="action-line"><span>Profile change requests</span><b>{d.pending_profile_requests||0}</b></div></Card></div><div className="quick-grid"><QuickCard to="/admin/students" icon={Users} title="Students" text="Add, edit, delete"/><QuickCard to="/admin/staff" icon={UserCheck} title="Staff, HODs & Advisors" text="Add, edit, delete"/><QuickCard to="/admin/academics" icon={GraduationCap} title="Academic Credentials" text="Curriculum, credits & grading"/><QuickCard to="/admin/departments" icon={Building2} title="Departments" text="Add departments, assign HODs"/><QuickCard to="/admin/venues" icon={Building2} title="Venues" text="Maintain college venues"/><QuickCard to="/admin/timings" icon={CalendarDays} title="Period Timings" text="Set timings for each year"/><QuickCard to="/admin/timetable" icon={CalendarDays} title="Class Timetable" text="Build class timetables"/><QuickCard to="/admin/staff-timetable" icon={CalendarDays} title="Staff Timetable" text="Individual staff timetables"/><QuickCard to="/admin/profile-requests" icon={UserCheck} title="Profile Requests" text={(d.pending_profile_requests||0)+" waiting for approval"}/><QuickCard to="/admin/reports" icon={BarChart3} title="Reports" text="Export attendance"/><QuickCard to="/admin/notifications" icon={Bell} title="Notifications" text="System alerts"/><QuickCard to="/admin/staff" icon={ClipboardList} title="Class Advisors" text="Assign each class"/></div></Page>;
}

export function Staff(){
  const [d,setD]=useState({}),[error,setError]=useState(''); const {user}=useAuth();

  // Class Advisor record loading state
  const advYear = user?.advisor_class ? user.advisor_class.split('-')[0].trim() : 'III';
  const advSec = user?.advisor_class && user.advisor_class.includes('-') ? user.advisor_class.split('-')[1].trim() : 'A';
  const [classYear, setClassYear] = useState(advYear || 'III');
  const [classSection, setClassSection] = useState(advSec || 'A');
  const [classSem, setClassSem] = useState(4);
  const [classRecords, setClassRecords] = useState([]);
  const [classLoading, setClassLoading] = useState(false);
  const [classError, setClassError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  // Class Advisor marksheet upload state
  const [advisorTab, setAdvisorTab] = useState('records'); // 'records' | 'upload'
  const [advisorUploadFile, setAdvisorUploadFile] = useState(null);
  const [advisorUploadSem, setAdvisorUploadSem] = useState(4);
  const [advisorAssessment, setAdvisorAssessment] = useState('Internal Assessment 1');
  const [advisorNotes, setAdvisorNotes] = useState('');
  const [advisorUploading, setAdvisorUploading] = useState(false);
  const [advisorUploadSuccess, setAdvisorUploadSuccess] = useState('');
  const [advisorUploadError, setAdvisorUploadError] = useState('');
  const [advisorMarksheets, setAdvisorMarksheets] = useState([]);
  const advisorFileInputRef = useRef(null);

  useEffect(()=>{api.get('/reports/attendance').then(r=>setD(r.data)).catch(e=>setError(e.response?.data?.message||'Dashboard data could not be loaded.'))},[]);

  const handleLoadClassRecord = () => {
    setClassLoading(true);
    setClassError('');
    api.get(`/academics/class-records?year=${classYear}&section=${classSection}&semester=${classSem}`)
      .then(res => {
        setClassRecords(res.data.records || []);
        setHasLoaded(true);
      })
      .catch(err => {
        setClassError(err.response?.data?.message || 'Failed to load class records.');
        setHasLoaded(true);
      })
      .finally(() => setClassLoading(false));
  };

  const loadAdvisorMarksheets = () => {
    api.get(`/academics/marksheets?semester=${advisorUploadSem}`)
      .then(res => setAdvisorMarksheets(res.data.marksheets || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (user?.is_class_advisor && advisorTab === 'upload') {
      loadAdvisorMarksheets();
    }
  }, [advisorUploadSem, advisorTab]);

  const handleAdvisorUpload = (e) => {
    if (e) e.preventDefault();
    const file = advisorUploadFile || advisorFileInputRef.current?.files?.[0];
    if (!file) {
      setAdvisorUploadError('Please select a file to upload (.xlsx, .csv, or .pdf).');
      return;
    }
    setAdvisorUploading(true);
    setAdvisorUploadError('');
    setAdvisorUploadSuccess('');

    const form = new FormData();
    form.append('file', file);
    form.append('semester', advisorUploadSem);
    form.append('assessment_type', advisorAssessment);
    form.append('notes', advisorNotes);
    if (user.department_id) form.append('department_id', user.department_id);

    uploadMarksheetFile(form)
      .then(res => {
        setAdvisorUploadSuccess(res.data.message || 'Marksheet uploaded and stored persistently.');
        setAdvisorUploadFile(null);
        setAdvisorNotes('');
        if (advisorFileInputRef.current) advisorFileInputRef.current.value = '';
        loadAdvisorMarksheets();
        if (hasLoaded && String(classSem) === String(advisorUploadSem)) {
          handleLoadClassRecord();
        }
      })
      .catch(err => {
        setAdvisorUploadError(errorMessage(err, 'File upload failed.'));
      })
      .finally(() => setAdvisorUploading(false));
  };

  return <Page><DashboardTop title={`Welcome, ${user.name} 👋`} subtitle={user.is_hod?'HOD workspace - department staff, timetables, approvals and reports':user.is_class_advisor?'Class advisor workspace - your class records, marksheet upload and student leave':'Staff workspace - your timetable, live attendance and academic records (view-only)'}/>{error&&<div className="alert">{error}</div>}<div className="stats"><Stat label="Present records" value={d.present||0} icon={<CheckCircle2/>}/><Stat label="Absent records" value={d.absent||0} icon={<Clock3/>}/><Stat label="OD records" value={d.od||0} icon={<ClipboardList/>}/><Stat label="Department" value={user.department||'—'} icon={<Building2/>}/></div>

    {/* Class Advisor Panel */}
    {user.is_class_advisor && (
      <Card className="mt p-4">
        <div className="card-title-row mb-4">
          <div>
            <h3 className="font-semibold text-white text-base">Class Advisor Workspace</h3>
            <p className="text-xs text-slate-400">Official academic performance records and persistent marksheet uploads</p>
          </div>
          <GraduationCap size={22} className="text-indigo-400"/>
        </div>

        <div className="flex gap-2 mb-4 border-b border-slate-700/60 pb-3">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              advisorTab === 'records' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            onClick={() => setAdvisorTab('records')}
          >
            <GraduationCap size={15}/> Class Academic Roster
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              advisorTab === 'upload' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            onClick={() => { setAdvisorTab('upload'); loadAdvisorMarksheets(); }}
          >
            <UploadCloud size={15}/> Upload Marksheet (.xlsx / .csv / .pdf)
          </button>
        </div>

        {advisorTab === 'records' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-4">
              <Select label="Class (Year)" value={classYear} onChange={e => setClassYear(e.target.value)}>
                <option value="I">Year I</option>
                <option value="II">Year II</option>
                <option value="III">Year III</option>
                <option value="IV">Year IV</option>
                <option value="ALL">All Years</option>
              </Select>
              <Select label="Section" value={classSection} onChange={e => setClassSection(e.target.value)}>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="ALL">All Sections</option>
              </Select>
              <Select label="Semester" value={classSem} onChange={e => setClassSem(parseInt(e.target.value))}>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
              </Select>
              <Button onClick={handleLoadClassRecord} disabled={classLoading}>
                <RefreshCw size={16} className={classLoading ? 'spin mr-1' : 'mr-1'}/>
                {classLoading ? 'Loading...' : 'Load Class Record'}
              </Button>
            </div>

            {classError && <div className="alert mb-4">{classError}</div>}

            {classLoading && (
              <div className="p-6 text-center text-slate-400"><RefreshCw className="spin inline mr-2"/> Loading class academic records for Year {classYear} Section {classSection}...</div>
            )}

            {!classLoading && hasLoaded && classRecords.length === 0 && (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-700 rounded-lg">
                <Users size={28} className="mx-auto mb-2 opacity-50"/>
                <p className="font-medium text-slate-300">No student records found for Year {classYear} - Section {classSection}.</p>
                <p className="text-xs text-slate-500 mt-1">Verify that students are enrolled in this year and section, or try selecting All Years.</p>
              </div>
            )}

            {!classLoading && hasLoaded && classRecords.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <span>Total Students: <b className="text-white">{classRecords.length}</b></span>
                  <span>Passed: <b className="text-emerald-400">{classRecords.filter(r => r.result === 'PASS').length}</b></span>
                  <span>Students with Arrears: <b className="text-amber-400">{classRecords.filter(r => r.arrears_count > 0).length}</b></span>
                  <span>Total Pending Arrears: <b className="text-rose-400">{classRecords.reduce((acc, r) => acc + (r.arrears_count || 0), 0)}</b></span>
                  <span className="ml-auto">
                    <Link to="/staff/academics" className="text-indigo-400 hover:underline">Open Full Academics Workspace →</Link>
                  </span>
                </div>

                <Table
                  heads={['Reg Number', 'Student Name', 'Class & Sec', `Sem ${classSem} SGPA`, 'Cumulative CGPA', 'Arrears', 'Status']}
                  rows={classRecords.map(r => [
                    <span key="reg" className="font-mono text-indigo-300 font-semibold">{r.register_number}</span>,
                    r.name,
                    `${r.year}-${r.section}`,
                    <span key="sg" className="font-bold text-slate-200">{r.sgpa ? Number(r.sgpa).toFixed(2) : '0.00'}</span>,
                    <span key="cg" className="font-bold text-slate-200">{r.cgpa ? Number(r.cgpa).toFixed(2) : '0.00'}</span>,
                    <span key="ar" className={`text-xs font-semibold px-2 py-0.5 rounded ${r.arrears_count > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                      {r.arrears_count > 0 ? `${r.arrears_count} Arrear(s)` : 'None'}
                    </span>,
                    <span key="st" className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      r.result === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' :
                      r.result === 'RA' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {r.result}
                    </span>
                  ])}
                />
              </div>
            )}
          </div>
        )}

        {advisorTab === 'upload' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                <UploadCloud size={16} className="text-indigo-400"/> Upload Marksheet File (Class Advisor Only)
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Upload Excel (.xlsx), CSV (.csv), or PDF (.pdf) marksheets. Files are stored persistently in the database and server storage with complete version history.
              </p>

              {advisorUploadSuccess && (
                <div className="p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                  {advisorUploadSuccess}
                </div>
              )}
              {advisorUploadError && (
                <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {advisorUploadError}
                </div>
              )}

              <form onSubmit={handleAdvisorUpload} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Select File (.xlsx, .csv, .pdf) *</label>
                    <input
                      type="file"
                      ref={advisorFileInputRef}
                      accept=".xlsx,.csv,.pdf"
                      className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                      onChange={e => {
                        setAdvisorUploadFile(e.target.files?.[0] || null);
                        setAdvisorUploadError('');
                      }}
                    />
                    {advisorUploadFile && (
                      <div className="mt-1 text-xs text-indigo-300 font-medium">
                        Selected: {advisorUploadFile.name} ({(advisorUploadFile.size / 1024).toFixed(1)} KB)
                      </div>
                    )}
                  </div>

                  <Select label="Semester *" value={advisorUploadSem} onChange={e => setAdvisorUploadSem(parseInt(e.target.value))}>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Assessment Title"
                    value={advisorAssessment}
                    onChange={e => setAdvisorAssessment(e.target.value)}
                    placeholder="e.g. Internal Assessment 1"
                  />
                  <Input
                    label="Notes / Comments"
                    value={advisorNotes}
                    onChange={e => setAdvisorNotes(e.target.value)}
                    placeholder="Optional notes regarding this marksheet"
                  />
                </div>

                <Button
                  type="submit"
                  onClick={handleAdvisorUpload}
                  disabled={advisorUploading || (!advisorUploadFile && !advisorFileInputRef.current?.files?.[0])}
                  className="w-full md:w-auto"
                >
                  <UploadCloud size={16} className={advisorUploading ? 'spin mr-1' : 'mr-1'}/>
                  {advisorUploading ? 'Uploading Marksheet...' : 'Upload Marksheet'}
                </Button>
              </form>
            </div>

            {/* Uploaded Marksheets List */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Stored Marksheets for Semester {advisorUploadSem} ({advisorMarksheets.length} files)
              </h4>
              {advisorMarksheets.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded">
                  No marksheets uploaded for Semester {advisorUploadSem} yet.
                </div>
              ) : (
                <Table
                  heads={['Filename', 'Type', 'Assessment', 'Version', 'Uploaded Date', 'Action']}
                  rows={advisorMarksheets.map(m => [
                    <span key="fn" className="font-mono text-xs text-indigo-300 font-medium">{m.original_filename}</span>,
                    <span key="tp" className="uppercase text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{m.file_type}</span>,
                    m.assessment_type,
                    <span key="vr" className="text-xs font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-700">v{m.version}</span>,
                    m.upload_date ? new Date(m.upload_date).toLocaleDateString() : '—',
                    <Button key="dl" variant="secondary" className="text-xs py-1 px-2" onClick={() => downloadMarksheetFile(m.id, m.original_filename)}>
                      <Download size={13} className="mr-1"/> Download
                    </Button>
                  ])}
                />
              )}
            </div>
          </div>
        )}
      </Card>
    )}

    <div className="quick-grid mt">
      <QuickCard to="/staff/attendance" icon={Activity} title="Take Attendance" text="Upload class photos / videos or use the camera"/>
      <QuickCard to="/staff/academics" icon={GraduationCap} title="Academics & Records" text={user.is_class_advisor ? "Class records, marksheet upload & SGPA/CGPA" : "View class marks & SGPA/CGPA (view-only)"}/>
      <QuickCard to="/staff/present" icon={CheckCircle2} title="Present List" text="View marked students"/>
      <QuickCard to="/staff/absent" icon={Users} title="Absent List" text="View absent records"/>
      <QuickCard to="/staff/timetable" icon={CalendarDays} title="My Timetable" text="Your periods this week"/>
      <QuickCard to="/staff/class-timetable" icon={CalendarDays} title="Class Timetable" text="View or edit a class"/>
      {(user.is_hod||user.is_class_advisor)&&<QuickCard to="/staff/od" icon={ClipboardList} title="Student OD" text="Review requests"/>}
      <QuickCard to="/staff/leaves" icon={FileText} title={(user.is_hod||user.is_class_advisor)?"Leave / Approvals":"My Leave"} text={(user.is_hod||user.is_class_advisor)?"Advisor and HOD workflow":"Apply for leave"}/>
      <QuickCard to="/staff/reports" icon={BarChart3} title="Reports" text="Download records"/>
      <QuickCard to="/staff/notifications" icon={Bell} title="Notifications" text="View updates"/>
    </div>
  </Page>;
}

export function Student(){
  const [d,setD]=useState({}),[error,setError]=useState(''); const {user}=useAuth();
  useEffect(() => {
    api.get('/attendance/summary')
      .then(r => setD(r.data))
      .catch(e => setError(e.response?.data?.message || 'Dashboard data could not be loaded.'));
  }, []);

  return (
    <Page>
      <DashboardTop
        title={`Welcome, ${user.name} 👋`}
        subtitle="Your attendance, timetable, academic results, OD and leave at a glance."
      />
      {error && <div className="alert">{error}</div>}
      <div className="stats">
        <Stat label="Attendance" value={(d.percentage || 0) + '%'} icon={<UserCheck />} />
        <Stat label="Present" value={d.present || 0} icon={<CheckCircle2 />} />
        <Stat label="Absent" value={d.absent || 0} icon={<Clock3 />} />
        <Stat label="OD" value={d.od || 0} icon={<ClipboardList />} />
      </div>
      <div className="dashboard-grid mt">
        <Card>
          <div className="card-title-row">
            <div>
              <h3>Attendance status</h3>
              <p>Keep your overall attendance healthy.</p>
            </div>
            <BarChart3 size={20} />
          </div>
          <div className="attendance-meter">
            <div style={{ width: `${Math.min(Number(d.percentage || 0), 100)}%` }} />
          </div>
          <strong>{d.percentage || 0}% overall attendance</strong>
        </Card>
        <Card>
          <div className="card-title-row">
            <div>
              <h3>Academic & Student Services</h3>
              <p>Academic performance and college requests</p>
            </div>
            <Activity size={20} />
          </div>
          <div className="quick-actions">
            <Link to="/student/academics">Academic Performance & Marksheets →</Link>
            <Link to="/student/attendance">View attendance →</Link>
            <Link to="/student/od">Apply OD →</Link>
            <Link to="/student/leave">Apply leave →</Link>
            <Link to="/student/notifications">Open notifications →</Link>
          </div>
        </Card>
      </div>
      <div className="quick-grid">
        <QuickCard to="/student/academics" icon={GraduationCap} title="Academic Performance" text="Semester results, SGPA/CGPA, marksheets & corrections" />
        <QuickCard to="/student/subjects" icon={BarChart3} title="Subject-wise" text="Compare percentages" />
        <QuickCard to="/student/timetable" icon={CalendarDays} title="My Timetable" text="View classes and venues" />
        <QuickCard to="/student/reports" icon={ClipboardList} title="Reports" text="Download attendance CSV" />
        <QuickCard to="/student/notifications" icon={Bell} title="Notifications" text="View latest updates" />
      </div>
    </Page>
  );
}
