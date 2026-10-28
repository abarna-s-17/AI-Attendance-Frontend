import { useEffect, useState } from 'react';
import api, { errorMessage } from '../services/api';
import { Page, Card, Button, Input, Alert, Table, PasswordInput } from '../components/UI';
import Modal from '../components/Modal';
import FaceScanner from '../components/FaceScanner';
import { useAuth } from '../context/AuthContext';

const roleLabel = (profile) => (profile.role === 'staff' ? (profile.staff_role || 'Staff') : profile.role === 'admin' ? 'Administrator' : 'Student');
const pill = (status) => <span className={'pill ' + ({ Approved: 'approved', Rejected: 'rejected', Pending: 'pending', Cancelled: 'na' }[status] || 'na')}>{status}</span>;
const when = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

function Change({ label, from, to }) {
  return <div className="diff"><small>{label}</small><s>{from}</s><b>{to}</b></div>;
}

// ------------------------------------------------------------------ My profile
export function MyProfile() {
  const { refresh } = useAuth();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [changeFace, setChangeFace] = useState(false);
  const [faceFiles, setFaceFiles] = useState([]);
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/profile')
    .then((response) => {
      setData(response.data);
      setForm({ name: response.data.profile.name, email: response.data.profile.email });
    })
    .catch((err) => setError(errorMessage(err, 'Your profile could not be loaded.')));
  useEffect(() => { load(); }, []);

  if (!data) return <Page title="My Profile">{error && <Alert>{error}</Alert>}</Page>;
  const { profile, needs_approval: needsApproval, pending, requests } = data;
  const isAdmin = profile.role === 'admin';

  const submit = (event) => {
    event.preventDefault();
    setError(''); setMessage('');
    if (changeFace && faceFiles.length < 3) { setError('Complete the camera face scan, or untick “Update my face”.'); return; }
    const body = new FormData();
    body.append('name', form.name);
    body.append('email', form.email);
    if (changeFace) faceFiles.forEach((file) => body.append('face_images', file, file.name));
    setBusy(true);
    api.post('/profile/requests', body, { timeout: 120000 })
      .then((response) => {
        setMessage(response.data.message);
        setChangeFace(false); setFaceFiles([]);
        return load().then(() => refresh && refresh());
      })
      .catch((err) => setError(errorMessage(err, 'The request could not be sent.')))
      .finally(() => setBusy(false));
  };

  const cancel = () => {
    api.delete('/profile/requests/' + pending.id)
      .then((response) => { setMessage(response.data.message); load(); })
      .catch((err) => setError(errorMessage(err, 'The request could not be cancelled.')));
  };

  const changePassword = (event) => {
    event.preventDefault();
    setError(''); setMessage('');
    if (passwords.new_password !== passwords.confirm_password) { setError('The new password and the confirm password do not match.'); return; }
    api.put('/profile/password', passwords)
      .then((response) => { setMessage(response.data.message); setPasswords({ current_password: '', new_password: '', confirm_password: '' }); })
      .catch((err) => setError(errorMessage(err, 'The password could not be changed.')));
  };

  return (
    <Page title="My Profile" subtitle={needsApproval ? 'Changes to your name, email or face are sent to the administrator and take effect after approval.' : 'As the administrator your changes are applied immediately.'}>
      {error && <Alert>{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <Card>
        <div className="profile-grid">
          <div><small>Name</small><b>{profile.name}</b></div>
          <div><small>Email</small><b>{profile.email}</b></div>
          <div><small>Account type</small><b>{roleLabel(profile)}</b></div>
          {profile.identity && <div><small>{profile.role === 'student' ? 'Register number' : 'Staff ID'}</small><b>{profile.identity}</b></div>}
          {profile.department && <div><small>Department</small><b>{profile.department}</b></div>}
          {profile.role === 'student' && <div><small>Year / Section</small><b>{profile.year} - {profile.section}</b></div>}
          {!isAdmin && <div><small>Face profile</small><b>{profile.face_registered ? 'Registered' : 'Not registered'}</b></div>}
        </div>
      </Card>

      {pending && (
        <Alert type="success">
          <b>Waiting for the administrator:</b> your request of {when(pending.created_at)}
          {pending.new_name ? ` · new name “${pending.new_name}”` : ''}{pending.new_email ? ` · new email ${pending.new_email}` : ''}{pending.face_requested ? ` · new face (${pending.face_samples} samples)` : ''}.
          {' '}<Button variant="ghost" onClick={cancel}>Cancel request</Button>
        </Alert>
      )}

      <Card className="mt">
        <h3>{needsApproval ? 'Request a change' : 'Update my account'}</h3>
        <form onSubmit={submit}>
          <div className="grid2">
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!!pending} />
            <Input label="Gmail / Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!pending} />
          </div>
          {!isAdmin && (
            <>
              <label className="check"><input type="checkbox" checked={changeFace} disabled={!!pending} onChange={(e) => { setChangeFace(e.target.checked); setFaceFiles([]); }} /> Update my face (new camera scan)</label>
              {changeFace && <FaceScanner onComplete={setFaceFiles} />}
            </>
          )}
          <div className="actions">
            <Button disabled={busy || !!pending}>{busy ? 'Sending…' : needsApproval ? 'Send to administrator' : 'Save changes'}</Button>
          </div>
          {needsApproval && <p className="hint">Your current name, email and face stay active until the administrator approves the request.</p>}
        </form>
      </Card>

      <Card className="mt">
        <h3>Change password</h3>
        <form onSubmit={changePassword} className="narrow">
          <PasswordInput label="Current password" required value={passwords.current_password} onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} />
          <PasswordInput label="New password" required minLength="6" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} />
          <PasswordInput label="Confirm new password" required minLength="6" value={passwords.confirm_password} onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })} />
          {passwords.confirm_password && <p className={'pw-match ' + (passwords.new_password === passwords.confirm_password ? 'ok' : 'bad')}>{passwords.new_password === passwords.confirm_password ? '✓ Passwords match' : '✗ Passwords do not match'}</p>}
          <Button>Change password</Button>
        </form>
        <p className="hint">Password changes do not need approval.</p>
      </Card>

      {needsApproval && requests.length > 0 && (
        <Card className="mt">
          <h3>My requests</h3>
          <Table
            heads={['Sent', 'Change', 'Status', 'Decided', 'Administrator note']}
            rows={requests.map((r) => [
              when(r.created_at),
              [r.new_name && `name → ${r.new_name}`, r.new_email && `email → ${r.new_email}`, r.face_requested && 'new face'].filter(Boolean).join(', ') || '—',
              pill(r.status),
              when(r.decided_at),
              r.admin_note || '—',
            ])}
          />
        </Card>
      )}
    </Page>
  );
}

// ------------------------------------------------- administrator: decide requests
export function ProfileRequests() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('Pending');
  const [photo, setPhoto] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get('/admin/profile-requests', { params: { status: filter } })
    .then((response) => setRows(response.data.requests || []))
    .catch((err) => setError(errorMessage(err, 'The requests could not be loaded.')));
  useEffect(() => { load(); }, [filter]);

  const decide = (item, status) => {
    const note = status === 'Rejected' ? window.prompt('Reason for rejecting (shown to the user, optional):', '') : '';
    if (note === null) return;
    setError(''); setMessage('');
    api.put('/admin/profile-requests/' + item.id, { status, note })
      .then((response) => { setMessage(`${item.name}: ${response.data.message}`); load(); })
      .catch((err) => { setError(errorMessage(err, 'The decision could not be saved.')); load(); });
  };

  const showPhoto = (item) => {
    api.get(`/admin/profile-requests/${item.id}/photo`, { responseType: 'blob' })
      .then((response) => setPhoto({ name: item.name, url: URL.createObjectURL(response.data) }))
      .catch(() => setError('No picture is available for this request.'));
  };

  const closePhoto = () => { if (photo) URL.revokeObjectURL(photo.url); setPhoto(null); };

  return (
    <Page title="Profile Requests" subtitle="Students and staff ask to change their name, email or face. Nothing changes until you approve.">
      {error && <Alert>{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}
      <div className="tt-tabs">
        {['Pending', 'Approved', 'Rejected', 'All'].map((s) => (
          <button key={s} type="button" className={'tt-tab' + (filter === s ? ' active' : '')} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>
      <Card>
        <Table
          heads={['Who', 'Department', 'Requested change', 'Sent', 'Status', 'Action']}
          rows={rows.map((item) => [
            <span className="leave-who" key={'w' + item.id}>{item.name}<small>{item.role === 'staff' ? 'Staff' : 'Student'} · {item.identity}</small></span>,
            item.department || '—',
            <div key={'c' + item.id}>
              {item.new_name && <Change label="Name" from={item.name} to={item.new_name} />}
              {item.new_email && <Change label="Email" from={item.email} to={item.new_email} />}
              {item.face_requested && (
                <div className="diff"><small>Face</small><b>New face scan ({item.face_samples} clear samples)</b>
                  {item.status === 'Pending' && <Button variant="ghost" onClick={() => showPhoto(item)}>View picture</Button>}
                </div>
              )}
            </div>,
            when(item.created_at),
            <span key={'s' + item.id}>{pill(item.status)}{item.admin_note && <small className="hint"> {item.admin_note}</small>}</span>,
            item.status === 'Pending' ? (
              <span className="rowactions" key={'a' + item.id}>
                <Button onClick={() => decide(item, 'Approved')}>Approve</Button>
                <Button variant="danger" onClick={() => decide(item, 'Rejected')}>Reject</Button>
              </span>
            ) : '—',
          ])}
        />
      </Card>
      {photo && (
        <Modal title={`New face of ${photo.name}`} onClose={closePhoto}>
          <img className="proof" src={photo.url} alt={`New face of ${photo.name}`} />
          <p className="hint">Check that this is really the person before approving.</p>
        </Modal>
      )}
    </Page>
  );
}
