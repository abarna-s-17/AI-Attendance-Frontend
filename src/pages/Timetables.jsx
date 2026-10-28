import { useEffect, useMemo, useState } from 'react';
import api, { errorMessage } from '../services/api';
import { Page, Card, Button, Input, Select, Alert } from '../components/UI';
import { useAuth } from '../context/AuthContext';

const YEARS = ['I', 'II', 'III', 'IV'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

function Err({ error }) {
  return error ? <Alert>{error}</Alert> : null;
}

/** Every subject gets its own soft colour, like a printed timetable. */
function subjectStyle(subject) {
  let hue = 0;
  for (const ch of subject || '') hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  return { background: `hsl(${hue} 85% 94%)`, borderLeft: `4px solid hsl(${hue} 60% 52%)` };
}

const span = (start, end) => `${start}–${end}`;

// ---------------------------------------------------------------- grids
/**
 * The class timetable: rows = days, columns = the periods of that year (breaks are shaded columns).
 * When onCell is given the cells can be clicked (used by the editor).
 */
export function ClassGrid({ grid, onCell, selected }) {
  const { days, periods, cells } = grid;
  if (!periods.length) {
    return <div className="tt-empty">No period timings are set for year {grid.class.year} yet. The administrator sets them under “Period Timings”.</div>;
  }
  return (
    <div className="tt-wrap">
      <table className="tt">
        <thead>
          <tr>
            <th className="tt-corner">Day / Period</th>
            {periods.map((p) => (
              <th key={p.id} className={p.is_break ? 'tt-head tt-break-head' : 'tt-head'}>
                <b>{p.label}</b>
                <small>{span(p.start_time, p.end_time)}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day, dayIndex) => (
            <tr key={day}>
              <th className="tt-day">{day}</th>
              {periods.map((p) => {
                if (p.is_break) {
                  return dayIndex === 0 ? (
                    <td key={p.id} className="tt-breakcell" rowSpan={days.length}><span>{p.label}</span></td>
                  ) : null;
                }
                const entry = cells[day]?.[p.id];
                const isSelected = selected && selected.day === day && selected.period.id === p.id;
                const click = onCell ? () => onCell({ day, period: p, entry }) : undefined;
                return (
                  <td
                    key={p.id}
                    className={'tt-cell' + (entry ? ' filled' : ' free') + (onCell ? ' clickable' : '') + (isSelected ? ' selected' : '')}
                    style={entry ? subjectStyle(entry.subject) : undefined}
                    onClick={click}
                    onKeyDown={onCell ? (e) => { if (e.key === 'Enter') click(); } : undefined}
                    tabIndex={onCell ? 0 : undefined}
                  >
                    {entry ? (
                      <>
                        <b>{entry.subject}</b>
                        {entry.faculty_name && <span>{entry.faculty_name}</span>}
                        {entry.venue && <em>{entry.venue}</em>}
                      </>
                    ) : (
                      <span className="tt-plus">{onCell ? '+ Add' : ''}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The individual staff timetable: rows = days, columns = period numbers; each cell tells which class it is. */
export function StaffGrid({ data }) {
  const { days, columns, cells } = data;
  return (
    <div className="tt-wrap">
      <table className="tt">
        <thead>
          <tr>
            <th className="tt-corner">Day / Period</th>
            {columns.map((c) => (
              <th key={c.no} className="tt-head">
                <b>{c.label}</b>
                <small>{c.time || 'time per year'}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day}>
              <th className="tt-day">{day}</th>
              {columns.map((c) => {
                const list = cells[day]?.[c.no] || [];
                if (!list.length) return <td key={c.no} className="tt-cell free"><span className="tt-plus">Free</span></td>;
                return (
                  <td key={c.no} className="tt-cell filled staffcell">
                    {list.map((e) => (
                      <div key={e.id} className="tt-chip" style={subjectStyle(e.subject)}>
                        <b>{e.subject}</b>
                        <span>{e.department_code} · {e.year}-{e.section}</span>
                        {e.venue && <em>{e.venue}</em>}
                        {!c.time && <small>{span(e.start_time, e.end_time)}</small>}
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------- class timetable page
function CellEditor({ grid, cell, staff, venues, onSaved, onCancel, setError }) {
  const entry = cell.entry;
  const [form, setForm] = useState({
    subject: entry?.subject || '',
    faculty: entry ? (entry.faculty_id ? String(entry.faculty_id) : entry.faculty_name ? 'other' : '') : '',
    faculty_name: entry && !entry.faculty_id ? entry.faculty_name : '',
    venue_name: entry?.venue || '',
  });
  const [busy, setBusy] = useState(false);

  const sortedStaff = useMemo(() => {
    const same = String(grid.class.department_id);
    return [...staff].sort((a, b) => (String(a.department_id) === same ? 0 : 1) - (String(b.department_id) === same ? 0 : 1) || a.name.localeCompare(b.name));
  }, [staff, grid.class.department_id]);

  const save = () => {
    setError('');
    if (!form.subject.trim()) { setError('Enter the subject.'); return; }
    const payload = {
      day: cell.day,
      period_id: cell.period.id,
      subject: form.subject,
      venue_name: form.venue_name,
      faculty_id: form.faculty && form.faculty !== 'other' ? Number(form.faculty) : '',
      faculty_name: form.faculty === 'other' ? form.faculty_name : '',
    };
    setBusy(true);
    const request = entry
      ? api.put('/timetable/' + entry.id, payload)
      : api.post('/timetable', { ...payload, department_id: grid.class.department_id, year: grid.class.year, section: grid.class.section });
    request.then(() => onSaved()).catch((err) => setError(errorMessage(err, 'The timetable could not be saved.'))).finally(() => setBusy(false));
  };

  const remove = () => {
    if (!window.confirm(`Remove ${entry.subject} from ${cell.day}, ${cell.period.label}?`)) return;
    setBusy(true);
    api.delete('/timetable/' + entry.id).then(() => onSaved()).catch((err) => setError(errorMessage(err, 'Could not delete the entry.'))).finally(() => setBusy(false));
  };

  return (
    <Card className="mt tt-editor">
      <h3>{cell.day} · {cell.period.label} <small>({span(cell.period.start_time, cell.period.end_time)})</small></h3>
      <div className="grid4">
        <Input label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Database Management" />
        <Select label="Staff" value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })}>
          <option value="">— No staff —</option>
          {sortedStaff.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.staff_id}) · {s.department_code}{s.staff_role !== 'Staff' ? ' · ' + s.staff_role : ''}</option>
          ))}
          <option value="other">Other (type a name)…</option>
        </Select>
        {form.faculty === 'other'
          ? <Input label="Faculty name" value={form.faculty_name} onChange={(e) => setForm({ ...form, faculty_name: e.target.value })} />
          : <div />}
        <label className="field">
          <span>Venue / Classroom</span>
          <input list="tt-venues" value={form.venue_name} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} placeholder="e.g. Room 301, IT Lab 2" />
          <datalist id="tt-venues">{venues.map((v) => <option key={v.id} value={v.name} />)}</datalist>
        </label>
      </div>
      <p className="hint">A staff member cannot be in two classes at the same time, and a venue cannot hold two classes at once. Selecting a registered staff member adds this period to his/her individual timetable.</p>
      <div className="actions">
        <Button onClick={save} disabled={busy}>{entry ? 'Update' : 'Add to timetable'}</Button>
        {entry && <Button variant="danger" onClick={remove} disabled={busy}>Remove</Button>}
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

/** Class timetable. student = read-only view of the student's own class. */
export function ClassTimetable({ student = false }) {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sel, setSel] = useState({ department_id: '', year: 'I', section: 'A' });
  const [ready, setReady] = useState(student);
  const [grid, setGrid] = useState(null);
  const [cell, setCell] = useState(null);
  const [staff, setStaff] = useState([]);
  const [venues, setVenues] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) return;
    Promise.all([api.get('/departments'), api.get('/timetable/classes'), api.get('/staff'), api.get('/venues').catch(() => ({ data: { venues: [] } }))])
      .then(([deps, cls, st, ven]) => {
        const departmentList = deps.data.departments || [];
        const classList = cls.data.classes || [];
        setDepartments(departmentList);
        setClasses(classList);
        setStaff(st.data.staff || []);
        setVenues(ven.data.venues || []);
        const own = user?.department_id;
        const pick = classList.find((c) => c.has_timetable && c.department_id === own)
          || classList.find((c) => c.has_timetable)
          || classList.find((c) => c.department_id === own);
        setSel(pick
          ? { department_id: String(pick.department_id), year: pick.year, section: pick.section }
          : { department_id: String(own || departmentList[0]?.id || ''), year: 'I', section: 'A' });
        setReady(true);
      })
      .catch((err) => setError(errorMessage(err, 'The timetable page could not be loaded.')));
  }, []);

  const load = () => {
    if (!ready || (!student && !sel.department_id)) return;
    api.get('/timetable/class', { params: student ? {} : sel })
      .then((response) => { setGrid(response.data); setError(''); })
      .catch((err) => { setGrid(null); setError(errorMessage(err, 'The timetable could not be loaded.')); });
  };

  useEffect(() => { setCell(null); load(); }, [ready, sel.department_id, sel.year, sel.section]);

  const sections = useMemo(() => {
    const set = new Set(SECTIONS);
    classes.filter((c) => String(c.department_id) === String(sel.department_id)).forEach((c) => set.add(c.section));
    return [...set].sort();
  }, [classes, sel.department_id]);
  const classChips = classes.filter((c) => String(c.department_id) === String(sel.department_id) && c.has_timetable);

  const editable = !student && grid?.editable;
  const heading = grid ? `${grid.class.department} · ${grid.class.year} Year · Section ${grid.class.section}` : '';

  const clearClassTimetable = () => {
    if (!window.confirm(`Are you sure you want to clear all timetable entries for ${heading}?`)) return;
    api.delete('/timetable/class', { params: sel })
      .then(() => { load(); setError(''); })
      .catch((err) => setError(errorMessage(err, 'Could not clear class timetable.')));
  };

  const deleteUnplaced = (entryId) => {
    api.delete('/timetable/' + entryId)
      .then(() => load())
      .catch((err) => setError(errorMessage(err, 'Could not delete entry.')));
  };

  const clearAllUnplaced = () => {
    if (!window.confirm('Delete all unplaced entries for this class?')) return;
    api.delete('/timetable/unplaced', { params: sel })
      .then(() => load())
      .catch((err) => setError(errorMessage(err, 'Could not remove unplaced entries.')));
  };

  return (
    <Page
      title={student ? 'My Class Timetable' : 'Class Timetable'}
      subtitle={student
        ? 'The weekly timetable of your class.'
        : 'Pick a class to see its weekly timetable. Click a cell to add or change a period.'}
      actions={
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {grid && editable && (
            <Button variant="danger" className="no-print" onClick={clearClassTimetable}>
              Clear Timetable
            </Button>
          )}
          {grid && <Button variant="ghost" className="no-print" onClick={() => window.print()}>Print / Save PDF</Button>}
        </div>
      }
    >
      <Err error={error} />
      {!student && (
        <Card className="no-print">
          <div className="grid4 tt-selectors">
            <Select label="Department" value={sel.department_id} onChange={(e) => setSel({ ...sel, department_id: e.target.value })}>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Select label="Year" value={sel.year} onChange={(e) => setSel({ ...sel, year: e.target.value })}>
              {YEARS.map((y) => <option key={y} value={y}>{y} Year</option>)}
            </Select>
            <Select label="Section" value={sel.section} onChange={(e) => setSel({ ...sel, section: e.target.value })}>
              {sections.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          {classChips.length > 0 && (
            <div className="tt-chips">
              <small>Classes with a timetable:</small>
              {classChips.map((c) => (
                <button
                  key={`${c.year}-${c.section}`}
                  type="button"
                  className={'tt-tab' + (c.year === sel.year && c.section === sel.section ? ' active' : '')}
                  onClick={() => setSel({ ...sel, year: c.year, section: c.section })}
                >
                  {c.year}-{c.section}
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {grid && (
        <Card className="mt tt-card">
          <div className="tt-title"><h3>{heading}</h3>{!editable && !student && <span className="pill na">view only</span>}</div>
          <ClassGrid grid={grid} onCell={editable ? setCell : undefined} selected={cell} />
          {grid.unplaced.length > 0 && (
            <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <b style={{ color: '#92400e' }}>
                  {grid.unplaced.length} older entr{grid.unplaced.length === 1 ? 'y' : 'ies'} could not be placed in a period:
                </b>
                {editable && (
                  <Button variant="danger" size="sm" onClick={clearAllUnplaced}>
                    Clear All Unplaced
                  </Button>
                )}
              </div>
              <ul style={{ margin: '0.5rem 0 0 1rem', color: '#78350f' }}>
                {grid.unplaced.map((u) => (
                  <li key={u.id} style={{ marginBottom: '0.35rem' }}>
                    <b>{u.day}</b> · {u.subject} {u.venue && <em>({u.venue})</em>} {u.start_time && <small>[{u.start_time}-{u.end_time}]</small>}
                    {editable && (
                      <Button variant="ghost" size="sm" onClick={() => deleteUnplaced(u.id)} style={{ marginLeft: '0.5rem', color: '#dc2626', padding: '0.1rem 0.4rem' }}>
                        ✕ Delete
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {editable && cell && (
        <CellEditor
          key={cell.day + cell.period.id}
          grid={grid}
          cell={cell}
          staff={staff}
          venues={venues}
          setError={setError}
          onCancel={() => setCell(null)}
          onSaved={() => { setCell(null); setError(''); load(); }}
        />
      )}
    </Page>
  );
}

// ------------------------------------------------------ staff timetable page
export function StaffTimetable() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const canPick = isAdmin || user.is_hod;
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [department, setDepartment] = useState('');
  const [staffId, setStaffId] = useState('');
  const [ready, setReady] = useState(!isAdmin);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canPick) return;
    const requests = [api.get('/staff')];
    if (isAdmin) requests.push(api.get('/departments'));
    Promise.all(requests).then(([st, deps]) => {
      const all = st.data.staff || [];
      setStaffList(all);
      if (isAdmin) {
        const depList = deps.data.departments || [];
        setDepartments(depList);
        const first = all[0];
        if (first) { setDepartment(String(first.department_id)); setStaffId(String(first.id)); }
        setReady(true);
      }
    }).catch((err) => setError(errorMessage(err, 'Staff could not be loaded.')));
  }, []);

  useEffect(() => {
    if (!ready) return;
    api.get('/timetable/staff', { params: staffId ? { staff_id: staffId } : {} })
      .then((response) => { setData(response.data); setError(''); })
      .catch((err) => { setData(null); setError(errorMessage(err, 'The staff timetable could not be loaded.')); });
  }, [ready, staffId]);

  const options = isAdmin
    ? staffList.filter((s) => String(s.department_id) === String(department))
    : staffList.filter((s) => s.department_id === user.department_id && s.email !== user.email);

  const changeDepartment = (value) => {
    setDepartment(value);
    const first = staffList.find((s) => String(s.department_id) === value);
    setStaffId(first ? String(first.id) : '');
    if (!first) setData(null);
  };

  return (
    <Page
      title={isAdmin || !data || data.staff.staff_id !== user.staff_id ? 'Staff Timetable' : 'My Timetable'}
      subtitle="The individual weekly timetable of one staff member - every period he/she teaches, in which class and venue."
      actions={data && <Button variant="ghost" className="no-print" onClick={() => window.print()}>Print / Save PDF</Button>}
    >
      <Err error={error} />
      {canPick && (
        <Card className="no-print">
          <div className="grid4 tt-selectors">
            {isAdmin && (
              <Select label="Department" value={department} onChange={(e) => changeDepartment(e.target.value)}>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            )}
            <Select label="Staff member" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {!isAdmin && <option value="">My timetable</option>}
              {options.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.staff_id}) · {s.staff_role}</option>)}
            </Select>
          </div>
        </Card>
      )}
      {data && (
        <Card className="mt tt-card">
          <div className="tt-title">
            <div>
              <h3>{data.staff.name} <small>({data.staff.staff_id})</small></h3>
              <p className="hint">{data.staff.department} · <span className="pill">{data.staff.staff_role}</span> · {data.total} period{data.total === 1 ? '' : 's'} a week</p>
            </div>
          </div>
          <StaffGrid data={data} />
          {data.unplaced.length > 0 && <p className="hint">{data.unplaced.length} older entr{data.unplaced.length === 1 ? 'y' : 'ies'} without a period are not shown.</p>}
          <p className="hint">Years can have different period timings, so a cell shows its own time when the columns differ.</p>
        </Card>
      )}
    </Page>
  );
}

// ------------------------------------------------------ period timings (admin)
const toMinutes = (t) => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };
const fromMinutes = (n) => { const x = Math.max(0, Math.min(n, 23 * 60 + 59)); return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };

export function PeriodTimings() {
  const [timings, setTimings] = useState(null);
  const [year, setYear] = useState('I');
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [copyFrom, setCopyFrom] = useState('');
  const [message, setMessage] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState('');
  const [conflictPrompt, setConflictPrompt] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/timings')
    .then((response) => setTimings(response.data.timings))
    .catch((err) => setError(errorMessage(err, 'Period timings could not be loaded.')));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!timings) return;
    setRows(timings[year].map((p) => ({ id: p.id, label: p.label, start_time: p.start_time, end_time: p.end_time, is_break: p.is_break })));
    setDirty(false);
    setConflictPrompt(null);
  }, [timings, year]);

  const change = (index, patch) => { setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r))); setDirty(true); };
  const remove = (index) => { setRows(rows.filter((_, i) => i !== index)); setDirty(true); };
  const move = (index, step) => {
    const target = index + step;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    setDirty(true);
  };
  const add = (isBreak) => {
    const last = rows[rows.length - 1];
    const start = last ? last.end_time : '09:00';
    const teaching = rows.filter((r) => !r.is_break).length + 1;
    setRows([...rows, {
      label: isBreak ? 'Break' : `Period ${teaching}`,
      start_time: start,
      end_time: fromMinutes(toMinutes(start) + (isBreak ? 15 : 50)),
      is_break: isBreak,
    }]);
    setDirty(true);
  };
  const copy = () => {
    if (!copyFrom) return;
    const mine = timings[year];
    setRows(timings[copyFrom].map((p, i) => ({ id: mine[i]?.id, label: p.label, start_time: p.start_time, end_time: p.end_time, is_break: p.is_break })));
    setDirty(true);
    setCopyFrom('');
  };
  const switchYear = (next) => {
    if (next === year) return;
    if (dirty && !window.confirm('You have unsaved changes for this year. Discard them?')) return;
    setYear(next);
    setMessage('');
    setWarnings([]);
    setError('');
    setConflictPrompt(null);
  };

  const save = (force = false) => {
    setError(''); setMessage(''); setWarnings([]); setConflictPrompt(null); setBusy(true);
    api.put('/timings/' + year, { periods: rows, force })
      .then((response) => {
        setMessage(response.data.message);
        setWarnings(response.data.warnings || []);
        setTimings((current) => ({ ...current, [year]: response.data.periods }));
        setDirty(false);
        setConflictPrompt(null);
      })
      .catch((err) => {
        const data = err.response?.data;
        if (data?.can_force) {
          setConflictPrompt(data);
          if (window.confirm(`${data.message}\n\nDo you want to delete those timetable entries and save the new timings now?`)) {
            save(true);
            return;
          }
        }
        setError(errorMessage(err, 'The timings could not be saved.'));
      })
      .finally(() => setBusy(false));
  };

  const resetToDefault = (force = false) => {
    if (!force && !window.confirm(`Reset ${year} Year period timings to the default schedule?`)) return;
    setBusy(true);
    api.post('/timings/' + year + '/reset', { force })
      .then((res) => {
        setMessage(res.data.message);
        setWarnings(res.data.warnings || []);
        setTimings((current) => ({ ...current, [year]: res.data.periods }));
        setDirty(false);
        setConflictPrompt(null);
      })
      .catch((err) => {
        const data = err.response?.data;
        if (data?.can_force && window.confirm(`${data.message}\n\nProceed and reset?`)) {
          resetToDefault(true);
          return;
        }
        setError(errorMessage(err, 'Could not reset timings.'));
      })
      .finally(() => setBusy(false));
  };

  const clearYear = () => {
    if (!window.confirm(`Are you sure you want to delete ALL timetable entries for ${year} Year? This cannot be undone.`)) return;
    setBusy(true);
    api.delete('/timings/' + year + '/timetable')
      .then((res) => {
        setMessage(res.data.message);
        load();
      })
      .catch((err) => setError(errorMessage(err, 'Could not clear year timetables.')))
      .finally(() => setBusy(false));
  };

  let teachingNumber = 0;
  return (
    <Page title="Period Timings" subtitle="Set the periods and breaks of the day for each year. Class and staff timetables use these timings.">
      <Err error={error} />
      {message && <Alert type="success">{message}</Alert>}
      {conflictPrompt && (
        <Alert>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div>
              <b>Timetable entries conflict:</b> {conflictPrompt.message}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button variant="danger" type="button" onClick={() => save(true)} disabled={busy}>
                {busy ? 'Saving…' : `Delete ${conflictPrompt.total_affected} Entries & Save Timings`}
              </Button>
              <Button variant="ghost" type="button" onClick={() => setConflictPrompt(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Alert>
      )}
      {warnings.length > 0 && (
        <Alert>
          <b>Check these clashes in the saved timetables:</b>
          <ul className="tt-warnings">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </Alert>
      )}
      <Card>
        <div className="tt-tabs">
          {YEARS.map((y) => (
            <button key={y} type="button" className={'tt-tab' + (y === year ? ' active' : '')} onClick={() => switchYear(y)}>{y} Year</button>
          ))}
        </div>

        <div className="tablewrap">
          <table className="tt-edit">
            <thead>
              <tr><th>#</th><th>Type</th><th>Name</th><th>Starts</th><th>Ends</th><th>Min.</th><th>Order / remove</th></tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                if (!row.is_break) teachingNumber += 1;
                const minutes = toMinutes(row.end_time) - toMinutes(row.start_time);
                return (
                  <tr key={row.id || `new-${i}`} className={row.is_break ? 'is-break' : ''}>
                    <td>{row.is_break ? '' : teachingNumber}</td>
                    <td>
                      <select value={row.is_break ? 'break' : 'period'} onChange={(e) => change(i, { is_break: e.target.value === 'break' })}>
                        <option value="period">Period</option>
                        <option value="break">Break</option>
                      </select>
                    </td>
                    <td><input value={row.label} onChange={(e) => change(i, { label: e.target.value })} /></td>
                    <td><input type="time" value={row.start_time} onChange={(e) => change(i, { start_time: e.target.value })} /></td>
                    <td><input type="time" value={row.end_time} onChange={(e) => change(i, { end_time: e.target.value })} /></td>
                    <td className={minutes > 0 ? '' : 'bad'}>{minutes > 0 ? minutes : '–'}</td>
                    <td className="rowactions">
                      <Button variant="ghost" type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</Button>
                      <Button variant="ghost" type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</Button>
                      <Button variant="danger" type="button" onClick={() => remove(i)} aria-label="Remove">✕</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="actions tt-toolbar" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <Button variant="ghost" type="button" onClick={() => add(false)}>+ Add period</Button>
          <Button variant="ghost" type="button" onClick={() => add(true)}>+ Add break</Button>
          <select className="tt-copy" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
            <option value="">Copy timings from…</option>
            {YEARS.filter((y) => y !== year).map((y) => <option key={y} value={y}>{y} Year</option>)}
          </select>
          <Button variant="ghost" type="button" onClick={copy} disabled={!copyFrom}>Copy</Button>
          <Button variant="ghost" type="button" onClick={() => resetToDefault(false)} title="Reset to default college schedule">Reset Defaults</Button>
          <Button variant="ghost" type="button" onClick={clearYear} title="Clear all timetable entries of this year" style={{ color: '#dc2626' }}>Clear {year} Timetable</Button>
          <span className="spacer" />
          <Button onClick={() => save(false)} disabled={busy || !dirty}>{busy ? 'Saving…' : `Save ${year} Year timings`}</Button>
        </div>
        <p className="hint">Times must not overlap. Periods and breaks can be added, reordered or removed as needed. If removing a period, any classes in that period can be automatically cleared upon saving.</p>
      </Card>
    </Page>
  );
}
