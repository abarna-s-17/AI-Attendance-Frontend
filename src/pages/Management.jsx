import { useEffect, useRef, useState } from 'react';
import api, { downloadCSV, downloadFile, downloadLeaveLetter, errorMessage } from '../services/api';
import { Page, Card, Button, Input, Select, Table, Alert, PasswordInput } from '../components/UI';
import { StudentEditModal, StaffEditModal } from './AdminManage';
import { useAuth } from '../context/AuthContext';

function ErrorBox({ error }) {
  return error ? <Alert>{error}</Alert> : null;
}

// Local calendar date (toISOString would give the UTC date, which is yesterday early in the morning in India).
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getError(error, fallback = 'Something went wrong') {
  return errorMessage(error, fallback);
}

export function Students() {
  const [data, setData] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [departments, setDepartments] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    api.get('/departments').then((response) => setDepartments(response.data.departments || [])).catch(() => {});
  }, []);

  const remove = (student) => {
    if (!window.confirm(`Delete ${student.name} (${student.register_number})?\nHis/her attendance, OD and leave records are deleted too. This cannot be undone.`)) return;
    api.delete('/admin/students/' + student.id)
      .then((response) => { setMessage(response.data.message); setError(''); load(); })
      .catch((err) => { setError(getError(err, 'The student could not be deleted.')); setMessage(''); });
  };

  const load = () => {
    setError('');
    api.get('/students', { params: { q: query } })
      .then((response) => setData(response.data.students || []))
      .catch((err) => setError(getError(err, 'Students could not be loaded.')));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Page title="Students" subtitle="Maintain student records across all four years and every department">
      <Card>
        <div className="search">
          <Input
            label="Search name or register number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') load();
            }}
          />
          <Button onClick={load}>Search</Button>
        </div>
        <ErrorBox error={error} />
        {message && <Alert type="success">{message}</Alert>}
        <Table
          heads={['Name', 'Register No.', 'Department', 'Year', 'Section', 'Class Advisor', 'Face', 'Actions']}
          rows={data.map((student) => [
            student.name,
            student.register_number,
            student.department,
            student.year,
            student.section,
            student.class_advisor || 'Not assigned',
            student.face_registered ? 'Registered' : 'Pending',
            <span className="rowactions" key={'act-' + student.id}>
              <Button variant="ghost" onClick={() => setEditing(student)}>Edit</Button>
              <Button variant="danger" onClick={() => remove(student)}>Delete</Button>
            </span>
          ])}
        />
      </Card>
      {editing && (
        <StudentEditModal
          student={editing}
          departments={departments}
          onClose={() => setEditing(null)}
          onSaved={(text) => { setEditing(null); setMessage(text); setError(''); load(); }}
        />
      )}
      <AdminStudentForm
        onSaved={(text, ok) => {
          if (ok) {
            setMessage(text);
            setError('');
            load();
          } else {
            setError(text);
          }
        }}
      />
    </Page>
  );
}

function AdminStudentForm({ onSaved }) {
  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: 'Student@123',
    register_number: '',
    department_id: '',
    year: 'I',
    section: 'A',
    class_advisor_id: ''
  });

  useEffect(() => {
    api.get('/departments')
      .then((response) => setDepartments(response.data.departments || []))
      .catch(() => {});
    api.get('/staff')
      .then((response) => setStaff(response.data.staff || []))
      .catch(() => {});
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    api.post('/admin/students', data)
      .then((response) => {
        onSaved(response.data.message, true);
        setForm((current) => ({ ...current, name: '', email: '', register_number: '' }));
      })
      .catch((err) => onSaved(getError(err, 'Student could not be created.'), false));
  };

  return (
    <Card className="mt">
      <h3>Add student</h3>
      <form onSubmit={submit}>
        <div className="grid4">
          <Input label="Name" name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Gmail" name="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <PasswordInput label="Password" name="password" required minLength="6" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input label="Register no." name="register_number" required value={form.register_number} onChange={(e) => setForm({ ...form, register_number: e.target.value })} />
          <Select label="Department" name="department_id" required value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
            <option value="">Select</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </Select>
          <Select label="Year" name="year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>
            {['I', 'II', 'III', 'IV'].map((year) => <option key={year}>{year}</option>)}
          </Select>
          <Input label="Section" name="section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })} />
          <Select label="Class advisor (optional)" name="class_advisor_id" value={form.class_advisor_id} onChange={(e) => setForm({ ...form, class_advisor_id: e.target.value })}>
            <option value="">Auto from class assignment</option>
            {staff.filter((member) => member.is_class_advisor).map((member) => (
              <option key={member.id} value={member.id}>{member.name} — {member.department}</option>
            ))}
          </Select>
        </div>
        <Button>Add student</Button>
      </form>
    </Card>
  );
}

export function Staffs() {
  const [data, setData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [assignment, setAssignment] = useState({ department_id: '', year: 'I', section: 'A', advisor_id: '' });
  const [editing, setEditing] = useState(null);
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: 'Staff@123', staff_id: '', department_id: '',
    subjects_handling: '', staff_role: 'Staff', advisor_class: ''
  });

  const load = () => {
    api.get('/staff')
      .then((response) => setData(response.data.staff || []))
      .catch((err) => setError(getError(err, 'Staff could not be loaded.')));
  };

  const loadAssignments = () => {
    api.get('/admin/class-assignments')
      .then((response) => setAssignments(response.data.assignments || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    api.get('/departments')
      .then((response) => setDepartments(response.data.departments || []))
      .catch((err) => setError(getError(err, 'Departments could not be loaded.')));
    loadAssignments();
  }, []);

  const addStaff = (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    // event.currentTarget is null once the request finishes, so keep the form element now.
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    data.set('staff_role', form.staff_role);

    api.post('/admin/staff', data)
      .then((response) => {
        setMessage(response.data.message);
        formElement.reset();
        setForm((current) => ({ ...current, name: '', email: '', staff_id: '', subjects_handling: '', staff_role: 'Staff', advisor_class: '' }));
        load();
        api.get('/departments').then((r) => setDepartments(r.data.departments || [])).catch(() => {});
      })
      .catch((err) => setError(getError(err, 'Staff could not be created.')));
  };

  const changeRole = (member, staffRole) => {
    setError('');
    setMessage('');
    api.put('/admin/staff/' + member.id, { staff_role: staffRole })
      .then(() => { setMessage(`${member.name} is now ${staffRole === 'Staff' ? 'a regular staff member' : 'a ' + staffRole}.`); load(); })
      .catch((err) => { setError(getError(err, 'Staff type could not be changed.')); load(); });
  };

  const saveAssignment = () => {
    if (!assignment.department_id || !assignment.advisor_id) {
      setError('Select department and advisor.');
      return;
    }
    api.post('/admin/class-assignments', assignment)
      .then((response) => {
        setMessage(response.data.message);
        setError('');
        loadAssignments();
      })
      .catch((err) => setError(getError(err, 'Could not assign class advisor.')));
  };

  const removeAssignment = (id) => {
    api.delete('/admin/class-assignments/' + id)
      .then(() => loadAssignments())
      .catch((err) => setError(getError(err, 'Could not remove assignment.')));
  };

  const removeStaff = (member) => {
    if (!window.confirm(`Delete ${member.name} (${member.staff_id})?\nTheir timetable periods lose the link to this account` + (member.staff_role === 'HOD' ? ', and the department is left without a HOD' : '') + '. This cannot be undone.')) return;
    api.delete('/admin/staff/' + member.id)
      .then((response) => { setMessage(response.data.message); setError(''); load(); loadAssignments(); api.get('/departments').then((r) => setDepartments(r.data.departments || [])).catch(() => {}); })
      .catch((err) => { setError(getError(err, 'The staff member could not be deleted.')); setMessage(''); });
  };

  const shown = data.filter((member) => (typeFilter === 'All' || member.staff_role === typeFilter)
    && (!search || `${member.name} ${member.staff_id} ${member.email}`.toLowerCase().includes(search.toLowerCase())));

  // Any non-HOD staff member of the department can be made the advisor of a class (he/she becomes a Class Advisor).
  const advisors = data.filter(
    (member) => !member.is_hod && String(member.department_id) === String(assignment.department_id)
  );

  return (
    <Page title="Staff, Class Advisors & HODs" subtitle="Every faculty member is one of three types: Staff, Class Advisor or HOD. One HOD per department and one class advisor per class section.">
      <ErrorBox error={error} />
      {message && <Alert type="success">{message}</Alert>}

      <Card>
        <div className="search">
          <Input label="Search name, staff ID or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select label="Show" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="All">All staff</option>
            <option value="HOD">HODs</option>
            <option value="Class Advisor">Class advisors</option>
            <option value="Staff">Regular staff</option>
          </Select>
        </div>
        <Table
          heads={['Staff ID', 'Name', 'Email', 'Department', 'Staff type', 'Subjects', 'Face', 'Actions']}
          rows={shown.map((member) => [
            member.staff_id,
            member.name,
            member.email,
            member.department,
            <select key={'role-' + member.id} className="role-select" value={member.staff_role} onChange={(e) => changeRole(member, e.target.value)}>
              <option value="Staff">Staff</option>
              <option value="Class Advisor">Class Advisor</option>
              <option value="HOD">HOD</option>
            </select>,
            member.subjects_handling || '—',
            member.face_registered ? 'Registered' : 'Pending',
            <span className="rowactions" key={'act-' + member.id}>
              <Button variant="ghost" onClick={() => setEditing(member)}>Edit</Button>
              <Button variant="danger" onClick={() => removeStaff(member)}>Delete</Button>
            </span>
          ])}
        />
      </Card>
      {editing && (
        <StaffEditModal
          member={editing}
          departments={departments}
          onClose={() => setEditing(null)}
          onSaved={(text) => { setEditing(null); setMessage(text); setError(''); load(); loadAssignments(); }}
        />
      )}

      <Card className="mt">
        <h3>Add staff member</h3>
        <form onSubmit={addStaff}>
          <div className="grid4">
            <Input label="Name" name="name" required />
            <Input label="Gmail" name="email" type="email" required />
            <PasswordInput label="Password" name="password" required minLength="6" defaultValue="Staff@123" />
            <Input label="Staff ID" name="staff_id" required />
            <Select label="Department" name="department_id" required>
              <option value="">Select</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </Select>
            <Input label="Subjects handled" name="subjects_handling" />
            <Select label="Staff type" value={form.staff_role} onChange={(e) => setForm({ ...form, staff_role: e.target.value })}>
              <option value="Staff">Staff (subject teacher)</option>
              <option value="Class Advisor">Class Advisor</option>
              <option value="HOD">HOD</option>
            </Select>
            <Input label="Advisor note (optional)" name="advisor_class" placeholder="III-A, II-B" />
          </div>
          <Button>Create staff member</Button>
        </form>
      </Card>

      <Card className="mt">
        <h3>Class advisor assignment</h3>
        <p className="hint">Assign an advisor to each department + year + section. Students in that class are automatically linked to the selected advisor.</p>
        <div className="grid4">
          <Select label="Department" value={assignment.department_id} onChange={(e) => setAssignment({ ...assignment, department_id: e.target.value, advisor_id: '' })}>
            <option value="">Select</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </Select>
          <Select label="Year" value={assignment.year} onChange={(e) => setAssignment({ ...assignment, year: e.target.value })}>
            {['I', 'II', 'III', 'IV'].map((year) => <option key={year}>{year}</option>)}
          </Select>
          <Input label="Section" value={assignment.section} onChange={(e) => setAssignment({ ...assignment, section: e.target.value.toUpperCase() })} />
          <Select label="Advisor" value={assignment.advisor_id} onChange={(e) => setAssignment({ ...assignment, advisor_id: e.target.value })}>
            <option value="">Select advisor</option>
            {advisors.map((member) => <option key={member.id} value={member.id}>{member.name} ({member.staff_id})</option>)}
          </Select>
        </div>
        <Button onClick={saveAssignment}>Save class advisor</Button>
        <Table
          heads={['Department', 'Year', 'Section', 'Advisor', 'Action']}
          rows={assignments.map((item) => [
            item.department,
            item.year,
            item.section,
            item.advisor,
            <Button key={item.id} variant="danger" onClick={() => removeAssignment(item.id)}>Remove</Button>
          ])}
        />
      </Card>
    </Page>
  );
}

export function Venues() {
  const blank = { name: '', capacity: 60, building: '', floor: '' };
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/venues')
      .then((response) => setRows(response.data.venues || []))
      .catch((err) => setError(getError(err, 'Venues could not be loaded.')));
  };

  useEffect(() => {
    load();
  }, []);

  const save = () => {
    setError('');
    const request = editing
      ? api.put('/venues/' + editing, form)
      : api.post('/venues', form);
    request
      .then(() => {
        setEditing(null);
        setForm(blank);
        load();
      })
      .catch((err) => setError(getError(err, 'Venue could not be saved.')));
  };

  const edit = (venue) => {
    setEditing(venue.id);
    setForm({ name: venue.name, capacity: venue.capacity, building: venue.building || '', floor: venue.floor || '' });
  };

  const remove = (id) => {
    api.delete('/venues/' + id)
      .then(load)
      .catch((err) => setError(getError(err, 'Could not remove venue.')));
  };

  return (
    <Page title="Venue Management" subtitle="Admin maintains the complete list of classrooms, labs and other college venues">
      <ErrorBox error={error} />
      <Card>
        <div className="grid4">
          <Input label="Venue name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          <Input label="Building" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
          <Input label="Floor" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
        </div>
        <div className="actions">
          <Button onClick={save}>{editing ? 'Update venue' : 'Add venue'}</Button>
          {editing && <Button variant="ghost" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</Button>}
        </div>
      </Card>
      <Card className="mt">
        <Table
          heads={['Venue', 'Capacity', 'Building', 'Floor', 'Actions']}
          rows={rows.map((venue) => [
            venue.name,
            venue.capacity,
            venue.building || '—',
            venue.floor || '—',
            <span className="rowactions" key={venue.id}>
              <Button onClick={() => edit(venue)}>Edit</Button>
              <Button variant="danger" onClick={() => remove(venue.id)}>Remove</Button>
            </span>
          ])}
        />
      </Card>
    </Page>
  );
}

export function OD() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    api.get('/od')
      .then((response) => setRows(response.data.requests || []))
      .catch((err) => setError(getError(err, 'OD requests could not be loaded.')));
  };

  useEffect(() => {
    load();
  }, []);

  const decide = (id, status) => {
    setError('');
    setMessage('');
    api.put('/od/' + id, { status })
      .then((response) => { setMessage(response.data.message); load(); })
      .catch((err) => { setError(getError(err, 'OD update failed.')); load(); });
  };

  const openDocument = (id) => {
    downloadFile(`/od/${id}/document`, `od_document_${id}`).catch(() => setError('The document could not be opened.'));
  };

  return (
    <Page title="Student OD Requests" subtitle="An OD needs the approval of the class advisor first and then of the HOD">
      <ErrorBox error={error} />
      {message && <Alert type="success">{message}</Alert>}
      <Card>
        <Table
          heads={['Student', 'Class', 'Date', 'Reason', 'Class Advisor', 'HOD', 'Overall', 'Waiting for', 'Document', 'Action']}
          rows={rows.map((item) => [
            <span className="leave-who" key={'w-' + item.id}>{item.student_name}<small>{item.register_number}</small></span>,
            item.class,
            item.date,
            item.reason,
            <StatusPill key={'a-' + item.id} value={item.advisor_status} />,
            <StatusPill key={'h-' + item.id} value={item.hod_status} />,
            <StatusPill key={'o-' + item.id} value={item.status} />,
            item.waiting_for,
            item.has_document ? <Button key={'d-' + item.id} variant="ghost" onClick={() => openDocument(item.id)}>View</Button> : '—',
            item.can_approve ? (
              <span className="rowactions" key={'actions-' + item.id}>
                <Button onClick={() => decide(item.id, 'Approved')}>Approve</Button>
                <Button variant="danger" onClick={() => decide(item.id, 'Rejected')}>Reject</Button>
              </span>
            ) : '—'
          ])}
        />
      </Card>
    </Page>
  );
}

export function Attendance({ status }) {
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState(localToday());
  const [error, setError] = useState('');

  const load = () => {
    api.get('/attendance/lists', { params: { date, status } })
      .then((response) => setRows(response.data.students || []))
      .catch((err) => setError(getError(err, 'Attendance list could not be loaded.')));
  };

  useEffect(() => {
    load();
  }, [date, status]);

  return (
    <Page title={`${status || 'Attendance'} List`} subtitle={`Attendance records for ${date}`}>
      <ErrorBox error={error} />
      <Card>
        <div className="toolbar">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Table
          heads={['Name', 'Register No.', 'Department', 'Year', 'Section', 'Subject', 'Period', 'Time', 'Status', 'Marked by', 'Venue']}
          rows={rows.map((item) => [item.name, item.register_number, item.department, item.year, item.section, item.subject, item.period || '—', item.time, <span key={item.attendance_id} className={'pill ' + ({ Present: 'present', Absent: 'absent', OD: 'od', Leave: 'leave' }[item.status] || 'na')}>{item.status}</span>, item.source || '—', item.venue])}
        />
      </Card>
    </Page>
  );
}

export function StudentAttendance() {
  const { user } = useAuth();
  const [data, setData] = useState({ attendance: [], percentage: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.student_id) return;
    api.get('/attendance/student/' + user.student_id)
      .then((response) => setData(response.data))
      .catch((err) => setError(getError(err, 'Attendance could not be loaded.')));
  }, [user?.student_id]);

  return (
    <Page title="My Attendance" subtitle={`Attendance: ${data.percentage}% (OD and approved leave are not counted against you)`}>
      <ErrorBox error={error} />
      <Card>
        <Table
          heads={['Subject', 'Date', 'Time', 'Status', 'Venue']}
          rows={data.attendance.map((item) => [
            item.subject,
            item.date,
            item.time,
            <span className={'pill ' + String(item.status).toLowerCase()} key={item.id}>{item.status}</span>,
            item.venue
          ])}
        />
      </Card>
    </Page>
  );
}

export function Subjects() {
  const [data, setData] = useState({ subjects: [], overall: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/attendance/subjects')
      .then((response) => setData(response.data))
      .catch((err) => setError(getError(err, 'Subject attendance could not be loaded.')));
  }, []);

  const level = (value) => (value >= 75 ? 'good' : value >= 65 ? 'warn' : 'low');

  return (
    <Page title="Subject-wise Attendance" subtitle={`Each subject once, with its overall attendance. Overall: ${data.overall}% (OD and approved leave are not counted against you)`}>
      <ErrorBox error={error} />
      <Card>
        <Table
          heads={['Subject', 'Periods', 'Present', 'Absent', 'OD', 'Leave', 'Overall attendance']}
          rows={data.subjects.map((s) => [
            <b key={'s-' + s.subject}>{s.subject}</b>,
            s.total,
            s.present,
            s.absent,
            s.od,
            s.leave,
            <div className={'subj-bar ' + level(s.percentage)} key={'p-' + s.subject}>
              <div className="track"><div style={{ width: Math.min(100, s.percentage) + '%' }} /></div>
              <b>{s.percentage}%</b>
            </div>
          ])}
        />
      </Card>
    </Page>
  );
}

export function ApplyOD() {
  const [form, setForm] = useState({ date: '', reason: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  const load = () => {
    api.get('/od')
      .then((response) => setRows(response.data.requests || []))
      .catch((err) => setError(getError(err, 'OD history could not be loaded.')));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    const file = formElement.elements.namedItem('document')?.files?.[0];
    if (file) data.append('document', file);
    setError('');
    setMessage('');

    api.post('/od', data)
      .then((response) => {
        setMessage(response.data.message);
        setForm({ date: '', reason: '' });
        formElement.reset();
        load();
      })
      .catch((err) => setError(getError(err, 'OD submission failed.')));
  };

  return (
    <Page title="Apply OD" subtitle="Submit an on-duty request. It is approved by your class advisor and then by your HOD.">
      <ErrorBox error={error} />
      {message && <Alert type="success">{message}</Alert>}
      <Card>
        <form onSubmit={submit} className="narrow">
          <Input label="OD date" name="date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <label className="field">
            <span>Reason</span>
            <textarea required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </label>
          <label className="upload">
            <b>Supporting document (optional)</b>
            <input name="document" type="file" />
          </label>
          <Button>Submit OD</Button>
        </form>
      </Card>
      <Card className="mt">
        <h3>My OD requests</h3>
        <Table
          heads={['Date', 'Reason', 'Class Advisor', 'HOD', 'Overall', 'Waiting for', 'Submitted']}
          rows={rows.map((item) => [
            item.date,
            item.reason,
            <StatusPill key={'a-' + item.id} value={item.advisor_status} />,
            <StatusPill key={'h-' + item.id} value={item.hod_status} />,
            <StatusPill key={'o-' + item.id} value={item.status} />,
            item.waiting_for,
            item.created_at ? new Date(item.created_at).toLocaleString() : ''
          ])}
        />
      </Card>
    </Page>
  );
}

function statusClass(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'approved') return 'approved';
  if (v === 'rejected') return 'rejected';
  if (v.startsWith('pending')) return 'pending';
  return 'na';
}

function StatusPill({ value }) {
  return <span className={'pill ' + statusClass(value)}>{value || '—'}</span>;
}

export function LeaveTable({ rows, staff = false, admin = false, onDecide = () => {}, onOpenLetter = () => {} }) {
  return (
    <Table
      heads={admin
        ? ['Requester', 'Type', 'From', 'To', 'Reason', 'Status', 'Letter', 'Action']
        : ['Requester', 'Type', 'From', 'To', 'Reason', 'Class Advisor', 'HOD', 'Overall', 'Waiting for', 'Letter', 'Action']}
      rows={rows.map((item) => {
        const who = <span className="leave-who">{item.requester}<small>{item.requester_detail}</small></span>;
        const letter = item.has_letter ? <Button variant="ghost" onClick={() => onOpenLetter(item.id)}>View</Button> : '—';
        const action = (staff || admin) && item.can_approve ? (
          <span className="rowactions">
            <Button onClick={() => onDecide(item.id, 'Approved')}>Approve</Button>
            <Button variant="danger" onClick={() => onDecide(item.id, 'Rejected')}>Reject</Button>
          </span>
        ) : '—';
        if (admin) {
          return [who, item.type, item.from_date, item.to_date, item.reason, <StatusPill value={item.status} />, letter, action];
        }
        return [
          who,
          item.type,
          item.from_date,
          item.to_date,
          item.reason,
          item.type === 'Student' ? <StatusPill value={item.advisor_status} /> : '—',
          <span><StatusPill value={item.hod_status} />{item.type === 'HOD' && <small className="hint"> by Administrator</small>}</span>,
          <StatusPill value={item.status} />,
          item.waiting_for,
          letter,
          action,
        ];
      })}
    />
  );
}

export function Leaves({ staff = false, admin = false }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    api.get('/leaves')
      .then((response) => setRows(response.data.leaves || []))
      .catch((err) => setError(getError(err, 'Leave page could not be loaded.')));
  };

  useEffect(() => {
    load();
  }, []);

  const decide = (id, status) => {
    setError('');
    setMessage('');
    api.put('/leaves/' + id, { status })
      .then((response) => {
        setMessage(response.data.message);
        load();
      })
      .catch((err) => {
        setError(getError(err, 'Leave approval failed.'));
        load();
      });
  };

  const openLetter = (id) => {
    downloadLeaveLetter(id).catch(() => setError('The leave letter could not be opened.'));
  };

  const plainStaff = staff && !user?.is_hod && !user?.is_class_advisor;
  const title = admin ? 'HOD Leave Requests' : plainStaff ? 'My Leave' : staff ? 'Leave & Approvals' : 'My Leave Requests';
  const subtitle = admin
    ? 'Leave requests submitted by HODs are approved by the Administrator.'
    : plainStaff
      ? 'Apply for your own leave. Your HOD approves it.'
    : staff
      ? 'Approve the requests assigned to you and submit your own staff leave.'
      : 'A student leave must be approved by the Class Advisor and then by the HOD.';

  return (
    <Page title={title} subtitle={subtitle}>
      <ErrorBox error={error} />
      {message && <Alert type="success">{message}</Alert>}
      {!staff && !admin && (
        <div className="leave-flow">
          Approval flow: <b>You</b> → <b>Class Advisor</b> → <b>HOD</b> → <b>Approved</b>. The leave is approved only after <b>both</b> have approved it.
        </div>
      )}
      <Card>
        <LeaveTable rows={rows} staff={staff} admin={admin} onDecide={decide} onOpenLetter={openLetter} />
      </Card>
      {!admin && <LeaveForm
        onSaved={load}
        title={staff ? 'Apply for your own staff leave' : 'Request leave'}
        note={staff && user?.is_hod ? 'As HOD, your leave request is approved by the Administrator.' : staff ? 'Your leave request is approved by your HOD.' : ''}
        submitLabel={staff ? 'Submit leave' : 'Submit leave request'}
      />}
    </Page>
  );
}

function LeaveForm({ onSaved, title, note, submitLabel }) {
  const empty = { from_date: '', to_date: '', reason: '' };
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const fileInput = useRef(null);

  const submit = (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (form.to_date < form.from_date) {
      setError('The "To" date cannot be before the "From" date.');
      return;
    }
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    // Read everything from the form NOW: event.currentTarget is null inside the async callbacks below.
    const file = fileInput.current?.files?.[0];
    if (file) data.append('letter', file);

    setBusy(true);
    api.post('/leaves', data)
      .then((response) => {
        setMessage(response.data.message);
        setForm(empty);
        setFileKey((key) => key + 1); // clears the file input
        if (onSaved) onSaved();
      })
      .catch((err) => setError(getError(err, 'Leave submission failed.')))
      .finally(() => setBusy(false));
  };

  return (
    <Card className="mt">
      <h3>{title}</h3>
      {note && <p className="hint">{note}</p>}
      <ErrorBox error={error} />
      {message && <Alert type="success">{message}</Alert>}
      <form onSubmit={submit} className="narrow">
        <div className="grid2">
          <Input label="From" type="date" required value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} />
          <Input label="To" type="date" required min={form.from_date || undefined} value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} />
        </div>
        <label className="field">
          <span>Reason</span>
          <textarea required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </label>
        <label className="upload">
          <b>Leave letter (optional - PDF, Word, image)</b>
          <input key={fileKey} ref={fileInput} name="letter" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" />
        </label>
        <Button disabled={busy}>{busy ? 'Submitting…' : submitLabel}</Button>
      </form>
    </Card>
  );
}

export function Reports() {
  const [error, setError] = useState('');

  const run = () => {
    downloadCSV().catch((err) => setError(getError(err, 'Could not download the report.')));
  };

  return (
    <Page title="Attendance Reports" subtitle="Download the records allowed for your role">
      <ErrorBox error={error} />
      <Card>
        <p>Students receive their own records. Staff receive their department records. Administrators receive all records.</p>
        <Button onClick={run}>Download Attendance CSV</Button>
      </Card>
    </Page>
  );
}

export function Notifications() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/notifications')
      .then((response) => setRows(response.data.notifications || []))
      .catch((err) => setError(getError(err, 'Notifications could not be loaded.')));
  };

  useEffect(() => {
    load();
  }, []);

  const markAll = () => {
    api.put('/notifications/read-all')
      .then(load)
      .catch((err) => setError(getError(err, 'Could not mark notifications as read.')));
  };

  const markOne = (id) => {
    api.put('/notifications/' + id + '/read')
      .then(load)
      .catch((err) => setError(getError(err, 'Could not mark notification as read.')));
  };

  return (
    <Page title="Notifications" subtitle="System alerts are stored here and can also be emailed when Gmail SMTP is configured">
      <ErrorBox error={error} />
      <Card>
        <div className="actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={markAll}>Mark all as read</Button>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">
            <b>No notifications yet</b>
            <p>New OD, leave and attendance updates will appear here.</p>
          </div>
        ) : (
          rows.map((notification) => (
            <div className={'notice ' + (notification.read ? 'read' : '')} key={notification.id}>
              <div>
                <b>{notification.type}</b>
                <p>{notification.message}</p>
                <small>{new Date(notification.created_at).toLocaleString()}</small>
              </div>
              {!notification.read && (
                <Button variant="ghost" onClick={() => markOne(notification.id)}>Mark read</Button>
              )}
            </div>
          ))
        )}
      </Card>
    </Page>
  );
}

export function Modify() {
  const [id, setId] = useState('');
  const [status, setStatus] = useState('Present');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const save = () => {
    api.put('/attendance/' + id, { status, reason })
      .then((response) => setMessage(response.data.message))
      .catch((err) => setMessage(getError(err, 'Failed')));
  };

  return (
    <Page title="Modify Attendance">
      <Card className="narrow">
        <Input label="Attendance record ID" value={id} onChange={(e) => setId(e.target.value)} />
        <Select label="New status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>Present</option>
          <option>Absent</option>
          <option>OD</option>
          <option>Leave</option>
        </Select>
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button onClick={save}>Save change</Button>
        {message && <Alert type="success">{message}</Alert>}
      </Card>
    </Page>
  );
}
