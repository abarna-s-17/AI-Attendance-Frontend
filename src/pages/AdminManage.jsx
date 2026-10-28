import { useEffect, useState } from 'react';
import api, { errorMessage } from '../services/api';
import { Page, Card, Button, Input, Select, Alert, Table, PasswordInput } from '../components/UI';
import Modal from '../components/Modal';

const YEARS = ['I', 'II', 'III', 'IV'];

// ---------------------------------------------------------------- students
export function StudentEditModal({ student, departments, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: student.name, email: student.email, register_number: student.register_number,
    department_id: String(student.department_id || ''), year: student.year || 'I', section: student.section || 'A', password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = (event) => {
    event.preventDefault();
    setError('');
    const payload = { ...form, department_id: Number(form.department_id) };
    if (!payload.password) delete payload.password;
    setBusy(true);
    api.put('/admin/students/' + student.id, payload)
      .then((response) => onSaved(response.data.message))
      .catch((err) => setError(errorMessage(err, 'The student could not be updated.')))
      .finally(() => setBusy(false));
  };

  return (
    <Modal title={`Edit student - ${student.name}`} onClose={onClose}>
      {error && <Alert>{error}</Alert>}
      <form onSubmit={save}>
        <div className="grid2">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Gmail / Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Register no." required value={form.register_number} onChange={(e) => setForm({ ...form, register_number: e.target.value })} />
          <Select label="Department" required value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select label="Year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </Select>
          <Input label="Section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })} />
          <PasswordInput label="New password (leave empty to keep)" minLength="6" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <p className="hint">The class advisor follows the class assignment of the new department / year / section automatically.</p>
        <div className="actions">
          <Button disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------- staff
export function StaffEditModal({ member, departments, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: member.name, email: member.email, staff_id: member.staff_id, department_id: String(member.department_id || ''),
    subjects_handling: member.subjects_handling || '', staff_role: member.staff_role || 'Staff', password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = (event) => {
    event.preventDefault();
    setError('');
    const payload = { ...form, department_id: Number(form.department_id) };
    if (!payload.password) delete payload.password;
    setBusy(true);
    api.put('/admin/staff/' + member.id, payload)
      .then((response) => onSaved(response.data.message))
      .catch((err) => setError(errorMessage(err, 'The staff member could not be updated.')))
      .finally(() => setBusy(false));
  };

  return (
    <Modal title={`Edit ${member.staff_role === 'HOD' ? 'HOD' : 'staff'} - ${member.name}`} onClose={onClose}>
      {error && <Alert>{error}</Alert>}
      <form onSubmit={save}>
        <div className="grid2">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Gmail / Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Staff ID" required value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} />
          <Select label="Department" required value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select label="Staff type" value={form.staff_role} onChange={(e) => setForm({ ...form, staff_role: e.target.value })}>
            <option value="Staff">Staff (subject teacher)</option>
            <option value="Class Advisor">Class Advisor</option>
            <option value="HOD">HOD</option>
          </Select>
          <Input label="Subjects handled" value={form.subjects_handling} onChange={(e) => setForm({ ...form, subjects_handling: e.target.value })} />
          <PasswordInput label="New password (leave empty to keep)" minLength="6" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <p className="hint">Making someone HOD replaces the current HOD of the department.</p>
        <div className="actions">
          <Button disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------- departments
export function Departments() {
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: '', code: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    api.get('/departments')
      .then((response) => setRows(response.data.departments || []))
      .catch((err) => setError(errorMessage(err, 'Departments could not be loaded.')));
  };

  useEffect(() => {
    load();
    api.get('/staff').then((response) => setStaff(response.data.staff || [])).catch(() => {});
  }, []);

  const done = (text) => { setMessage(text); setError(''); load(); };
  const fail = (err, fallback) => { setError(errorMessage(err, fallback)); setMessage(''); };

  const add = (event) => {
    event.preventDefault();
    api.post('/admin/departments', form)
      .then((response) => { done(response.data.message); setForm({ name: '', code: '' }); })
      .catch((err) => fail(err, 'The department could not be added.'));
  };

  const saveEdit = (event) => {
    event.preventDefault();
    api.put('/admin/departments/' + editing.id, { name: editing.name, code: editing.code })
      .then((response) => { done(response.data.message); setEditing(null); })
      .catch((err) => fail(err, 'The department could not be updated.'));
  };

  const remove = (department) => {
    if (!window.confirm(`Delete the department ${department.name}?`)) return;
    api.delete('/admin/departments/' + department.id)
      .then((response) => done(response.data.message))
      .catch((err) => fail(err, 'The department could not be deleted.'));
  };

  const assignHod = (department, hodId) => {
    api.put('/admin/departments/' + department.id + '/hod', { hod_id: hodId || null })
      .then((response) => done(response.data.message))
      .catch((err) => fail(err, 'HOD assignment failed.'));
  };

  return (
    <Page title="Departments" subtitle="Add new departments, rename or delete them, and assign one HOD to each department">
      {error && <Alert>{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <Card>
        <h3>Add a department</h3>
        <form onSubmit={add}>
          <div className="grid4">
            <Input label="Department name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Data Science" />
            <Input label="Code" required maxLength="20" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. DS" />
          </div>
          <Button>Add department</Button>
        </form>
      </Card>

      <Card className="mt">
        <Table
          heads={['Code', 'Department', 'Students', 'Staff', 'HOD', 'Assign HOD', 'Actions']}
          rows={rows.map((department) => [
            department.code,
            department.name,
            department.student_count,
            department.staff_count,
            department.hod || 'Not assigned',
            <Select key={'hod-' + department.id} label="" value={department.hod_id || ''} onChange={(e) => assignHod(department, e.target.value)}>
              <option value="">Not assigned</option>
              {staff.filter((m) => String(m.department_id) === String(department.id)).map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.staff_id})</option>
              ))}
            </Select>,
            <span className="rowactions" key={'act-' + department.id}>
              <Button variant="ghost" onClick={() => setEditing({ id: department.id, name: department.name, code: department.code })}>Edit</Button>
              <Button variant="danger" onClick={() => remove(department)}>Delete</Button>
            </span>,
          ])}
        />
        <p className="hint">A department can only be deleted when it has no students, staff, timetable or class assignments. Staff of a department become eligible HODs when you assign them here (or set their type to HOD under Staff).</p>
      </Card>

      {editing && (
        <Modal title="Edit department" onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit}>
            <div className="grid2">
              <Input label="Department name" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <Input label="Code" required maxLength="20" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="actions">
              <Button>Save changes</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
    </Page>
  );
}
