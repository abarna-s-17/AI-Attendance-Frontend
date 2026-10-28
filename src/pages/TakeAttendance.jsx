import { useEffect, useMemo, useRef, useState } from 'react';
import api, { errorMessage } from '../services/api';
import { Page, Card, Button, Input, Select, Alert } from '../components/UI';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['Present', 'Absent', 'OD', 'Leave'];
const YEARS = [
  { value: 'I', label: '1st Year (I)' },
  { value: 'II', label: '2nd Year (II)' },
  { value: 'III', label: '3rd Year (III)' },
  { value: 'IV', label: '4th Year (IV)' },
];
const DEFAULT_SECTIONS = ['A', 'B', 'C', 'D'];
const weekdayOf = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const size = (bytes) => (bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB');
const isVideo = (file) => file.type.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv|m4v|mpg|mpeg|3gp|wmv)$/i.test(file.name);
const pillClass = (status) => ({ Present: 'present', Absent: 'absent', OD: 'od', Leave: 'leave' }[status] || 'na');

/** Combines the answers of several upload requests (one per file) into one result. */
function mergeResults(list) {
  const marked = new Map(); const upgraded = new Map(); const already = new Map();
  let faces = 0; let unrecognised = 0; const files = []; const uncertain = [];
  list.forEach((r) => {
    faces += r.faces || 0; unrecognised += r.unrecognised_faces || 0;
    (r.files || []).forEach((f) => files.push(f));
    (r.marked || []).forEach((p) => marked.set(p.id, p));
    (r.upgraded || []).forEach((p) => upgraded.set(p.id, p));
    (r.already_marked || []).forEach((p) => already.set(p.id, p));
    (r.uncertain || []).forEach((pair) => uncertain.push(pair));
  });
  marked.forEach((_, id) => already.delete(id));
  upgraded.forEach((_, id) => already.delete(id));
  const last = list[list.length - 1] || {};
  const doneNames = new Set([...marked.values(), ...upgraded.values(), ...already.values()].map((p) => p.name));
  return {
    faces, unrecognised, files,
    marked: [...marked.values()], upgraded: [...upgraded.values()], already: [...already.values()],
    uncertain: uncertain.filter((pair) => !pair.some((label) => doneNames.has(label.replace(/ \(.*\)$/, '')))),
    noProfile: last.no_face_profile || [], warning: last.warning,
  };
}

function Chips({ people, show }) {
  return (
    <div className="ta-chips">
      {people.map((p) => (
        <span key={p.id} className="ta-chip" title={p.register_number}>
          {p.name}{show === 'match' && p.match ? ` · ${p.match}%` : ''}{show === 'status' && p.status ? ` · ${p.status}` : ''}
        </span>
      ))}
    </div>
  );
}

function ResultCard({ result }) {
  const done = result.marked.length + result.upgraded.length;
  return (
    <Card className="mt ta-result">
      <h3>Result</h3>
      <div className="ta-stats">
        <div><b>{done}</b><span>marked present</span></div>
        <div><b>{result.already.length}</b><span>already marked</span></div>
        <div><b>{result.unrecognised}</b><span>faces not recognised</span></div>
        <div><b>{result.faces}</b><span>faces seen</span></div>
      </div>
      {result.warning && <p className="hint">{result.warning}</p>}
      {done === 0 && result.faces > 0 && result.already.length === 0 && (
        <div style={{ marginTop: '10px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '13px' }}>
          <b>No matching students recognized:</b> {result.faces} face(s) were detected, but they did not match the registered face profiles of this class. Ensure good lighting, front-facing poses, and that students have their face profiles registered.
        </div>
      )}
      {done === 0 && result.faces === 0 && (
        <div style={{ marginTop: '10px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '13px' }}>
          <b>No faces detected:</b> No clear faces were detected in the uploaded file. Ensure photos and videos are upright, clear, and well-lit.
        </div>
      )}
      {done > 0 && <><h4>Marked present</h4><Chips people={[...result.marked, ...result.upgraded]} show="match" /></>}
      {result.already.length > 0 && <><h4>Already had a record for this period (not duplicated)</h4><Chips people={result.already} show="status" /></>}
      {result.uncertain.length > 0 && (
        <><h4>Could not decide - looks like two students</h4>
          <p className="hint">These faces matched two students almost equally, so nobody was marked. Mark them manually in the list below: {result.uncertain.map((p) => p.join(' / ')).join('; ')}.</p></>
      )}
      {result.noProfile.length > 0 && (
        <><h4>No registered face - mark manually</h4><Chips people={result.noProfile} /></>
      )}
      {result.files.length > 0 && (
        <ul className="ta-files">
          {result.files.map((f, i) => (
            <li key={i} className={f.error ? 'bad' : ''}>
              <b>{f.name}</b>{' - '}
              {f.error ? f.error
                : f.kind === 'video'
                  ? `${f.frames} frames checked, ${f.recognised} new student(s) recognised${f.stopped_early ? ' (stopped at the time limit)' : ''}`
                  : `${f.faces} face(s) found, ${f.recognised} new student(s) recognised`}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function TakeAttendance() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [year, setYear] = useState('III');
  const [section, setSection] = useState('A');
  const [timetable, setTimetable] = useState([]);
  const [slotId, setSlotId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [tab, setTab] = useState('upload');
  const [roster, setRoster] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // upload tab
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const picker = useRef(null);

  // camera tab
  const video = useRef(null);
  const stream = useRef(null);
  const scanning = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [auto, setAuto] = useState(false);
  const [cameraNote, setCameraNote] = useState('');

  const selectedDay = weekdayOf(date);
  const slot = timetable.find((t) => String(t.id) === String(slotId));

  const availableSections = useMemo(() => {
    const set = new Set(DEFAULT_SECTIONS);
    classes.filter((c) => c.year === year).forEach((c) => set.add(c.section));
    return [...set].sort();
  }, [classes, year]);

  const classesWithTimetable = useMemo(() => {
    return classes.filter((c) => c.has_timetable);
  }, [classes]);

  const dayPeriods = useMemo(() => {
    return timetable
      .filter((item) => item.day === selectedDay && item.year === year && item.section === section)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '') || (a.period_no || 0) - (b.period_no || 0));
  }, [timetable, selectedDay, year, section]);

  useEffect(() => {
    api.get('/timetable/classes')
      .then((res) => {
        const list = res.data.classes || [];
        setClasses(list);
        if (user?.advisor_year) {
          setYear(user.advisor_year);
          if (user.advisor_section) setSection(user.advisor_section);
        } else {
          const match = list.find((c) => c.has_timetable && c.department_id === user?.department_id)
            || list.find((c) => c.has_timetable)
            || list[0];
          if (match) {
            setYear(match.year);
            setSection(match.section);
          }
        }
      })
      .catch(() => {});
    return () => stopCamera();
  }, [user]);

  useEffect(() => {
    api.get('/timetable', { params: { year, section, department_id: user?.department_id } })
      .then((response) => {
        setTimetable(response.data.timetable || []);
      })
      .catch((err) => setError(errorMessage(err, 'The timetable could not be loaded.')));
  }, [year, section, user?.department_id]);

  useEffect(() => {
    if (slotId && !dayPeriods.some((p) => String(p.id) === String(slotId))) {
      setSlotId('');
    }
  }, [dayPeriods, slotId]);

  const loadRoster = () => {
    if (!slotId || !date) { setRoster(null); return Promise.resolve(); }
    return api.get('/attendance/period', { params: { timetable_id: slotId, date } })
      .then((response) => setRoster(response.data))
      .catch((err) => { setRoster(null); setError(errorMessage(err, 'The class list could not be loaded.')); });
  };
  useEffect(() => { setResult(null); setMessage(''); loadRoster(); }, [slotId, date]);

  // ------------------------------------------------------------ upload
  const addFiles = (list) => {
    const picked = Array.from(list || []).filter((f) => f.type.startsWith('image/') || isVideo(f) || /\.(jpe?g|png|webp|bmp)$/i.test(f.name));
    if (picked.length < (list || []).length) setError('Only photos and videos can be used. Other files were skipped.');
    setFiles((current) => [...current, ...picked]);
  };

  const recognise = async () => {
    setError(''); setMessage(''); setResult(null);
    if (!slotId) { setError('Select the period first.'); return; }
    if (!files.length) { setError('Choose at least one photo or video.'); return; }
    setBusy(true);
    const answers = [];
    try {
      for (let i = 0; i < files.length; i += 1) {
        setProgress({ index: i + 1, total: files.length, name: files[i].name, percent: 0 });
        const form = new FormData();
        form.append('timetable_id', slotId);
        form.append('date', date);
        form.append('files', files[i], files[i].name);
        // one request per file keeps every request short and shows real progress
        const response = await api.post('/attendance/upload', form, {
          timeout: 15 * 60 * 1000,
          onUploadProgress: (e) => setProgress((p) => ({ ...p, percent: e.total ? Math.round((e.loaded / e.total) * 100) : 0 })),
        });
        answers.push(response.data);
        setResult(mergeResults(answers));
      }
      setMessage('Done. The class list below is updated.');
      setFiles([]);
    } catch (err) {
      setError(errorMessage(err, 'The upload could not be processed.'));
      if (answers.length) setResult(mergeResults(answers));
    } finally {
      setBusy(false);
      setProgress(null);
      loadRoster();
    }
  };

  // ------------------------------------------------------------ camera
  const stopCamera = () => {
    if (stream.current) stream.current.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCameraOn(false);
    setAuto(false);
  };

  const startCamera = async () => {
    setError('');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (video.current) video.current.srcObject = stream.current;
      setCameraOn(true);
    } catch {
      setError('The camera could not be opened. Allow camera access in the browser (it works on localhost or HTTPS).');
    }
  };

  const scanOnce = async () => {
    if (scanning.current || !video.current || !slotId) return;
    if (!video.current.videoWidth) { setCameraNote('The camera is still starting...'); return; }
    scanning.current = true;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.current.videoWidth; canvas.height = video.current.videoHeight;
      canvas.getContext('2d').drawImage(video.current, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      const form = new FormData();
      form.append('timetable_id', slotId); form.append('date', date); form.append('image', blob, 'camera.jpg');
      const response = await api.post('/attendance/recognize', form, { timeout: 120000 });
      setCameraNote(response.data.message);
      if ((response.data.marked || []).length || (response.data.upgraded || []).length) loadRoster();
    } catch (err) {
      setCameraNote(errorMessage(err, 'The picture could not be processed.'));
      setAuto(false);
    } finally {
      scanning.current = false;
    }
  };

  useEffect(() => {
    if (!auto || !cameraOn) return undefined;
    const timer = setInterval(scanOnce, 4000);
    return () => clearInterval(timer);
  }, [auto, cameraOn, slotId, date]);

  // ------------------------------------------------------------ roster
  const setStatus = (student, status) => {
    setError('');
    api.post('/attendance', { student_id: student.id, timetable_id: slotId, date, status })
      .then(() => loadRoster())
      .catch((err) => setError(errorMessage(err, 'The status could not be changed.')));
  };

  const finish = () => {
    if (!roster) return;
    if (!window.confirm(`Mark the ${roster.counts['Not marked']} student(s) who are not marked yet as Absent?`)) return;
    api.post('/attendance/finalize', { timetable_id: slotId, date })
      .then((response) => { setMessage(response.data.message); loadRoster(); })
      .catch((err) => setError(errorMessage(err, 'The period could not be finished.')));
  };

  const mismatch = slot && weekdayOf(date) !== slot.day;

  return (
    <Page title="Take Attendance" subtitle="Upload photos or recordings of the class - every face is recognised and marked, once per period. The live camera is optional.">
      {error && <Alert>{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <Card>
        <div className="grid4">
          <Select
            label="Year"
            value={year}
            onChange={(e) => { setYear(e.target.value); setSlotId(''); }}
          >
            {YEARS.map((y) => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </Select>

          <Select
            label="Class / Section"
            value={section}
            onChange={(e) => { setSection(e.target.value); setSlotId(''); }}
          >
            {availableSections.map((s) => (
              <option key={s} value={s}>Section {s} ({year}-{s})</option>
            ))}
          </Select>

          <Input
            label={`Date (${selectedDay})`}
            type="date"
            max={todayISO()}
            value={date}
            onChange={(e) => { setDate(e.target.value || todayISO()); setSlotId(''); }}
          />

          <Select
            label={`Period (${selectedDay}'s Periods)`}
            value={slotId}
            onChange={(e) => setSlotId(e.target.value)}
          >
            <option value="">
              {dayPeriods.length === 0
                ? `No periods scheduled on ${selectedDay}`
                : `Select period (${dayPeriods.length} on ${selectedDay})`}
            </option>
            {dayPeriods.map((item) => (
              <option key={item.id} value={item.id}>
                {item.period_label || 'Period'} · {item.start_time}-{item.end_time} · {item.subject} ({item.faculty_name || 'Staff'}{item.faculty_id === user?.staff_pk ? ' - You' : ''})
              </option>
            ))}
          </Select>
        </div>

        <div className="ta-class-banner">
          <div className="ta-class-info">
            <span className="ta-class-pill">{year} Year · Section {section}</span>
            <span className="ta-class-title">
              Class: <b>{user?.department || 'Department'} · {YEARS.find((y) => y.value === year)?.label || year + ' Year'} - Section {section} ({year}-{section})</b>
            </span>
            <span className="ta-class-date">📅 <b>{selectedDay}</b>, {date}</span>
          </div>
          {classesWithTimetable.length > 0 && (
            <div className="tt-chips">
              <small>Classes with timetable:</small>
              {classesWithTimetable.map((c) => (
                <button
                  key={`${c.year}-${c.section}`}
                  type="button"
                  className={'tt-tab' + (c.year === year && c.section === section ? ' active' : '')}
                  onClick={() => { setYear(c.year); setSection(c.section); setSlotId(''); }}
                >
                  {c.year}-{c.section}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="hint">
          {user?.is_hod
            ? 'As HOD you can take the attendance of any period of your department across all four years.'
            : user?.is_class_advisor
              ? `Signed in as Class Advisor${user?.advisor_year ? ` for ${user.advisor_year}-${user.advisor_section}` : ''}. You can take attendance for all periods of your class.`
              : 'Showing all scheduled periods for this class. Select a period to mark attendance.'}
        </p>
        {dayPeriods.length === 0 && (
          <p className="hint warn">
            No periods are scheduled in the timetable for {year}-{section} on {selectedDay}. You can configure periods under Class Timetable.
          </p>
        )}
      </Card>

      <div className="ta-tabs">
        <button type="button" className={'tt-tab' + (tab === 'upload' ? ' active' : '')} onClick={() => setTab('upload')}>Upload photos / videos</button>
        <button type="button" className={'tt-tab' + (tab === 'camera' ? ' active' : '')} onClick={() => setTab('camera')}>Live camera (optional)</button>
      </div>

      {tab === 'upload' && (
        <Card>
          <div
            className={'ta-drop' + (dragging ? ' over' : '')}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            onClick={() => picker.current && picker.current.click()}
          >
            <b>Drop photos or videos here, or click to choose</b>
            <span>One or many files - a photo of the whole class, several group photos, or a recording of the class. Every face found is recognised.</span>
            <input ref={picker} type="file" multiple accept="image/*,video/*" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>

          {files.length > 0 && (
            <ul className="ta-files picked">
              {files.map((f, i) => (
                <li key={f.name + i}>
                  <span>{isVideo(f) ? '🎞' : '🖼'} <b>{f.name}</b> <small>{size(f.size)}</small></span>
                  <button type="button" className="ta-x" disabled={busy} onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
                </li>
              ))}
            </ul>
          )}

          {progress && (
            <div className="ta-progress">
              <div className="bar"><div style={{ width: progress.percent + '%' }} /></div>
              <small>File {progress.index} of {progress.total}: {progress.name} {progress.percent < 100 ? `(uploading ${progress.percent}%)` : '(recognising faces - videos can take a minute)'}</small>
            </div>
          )}

          <div className="actions">
            <Button onClick={recognise} disabled={busy || !files.length || !slotId}>{busy ? 'Recognising…' : `Recognise faces & mark attendance${files.length ? ` (${files.length} file${files.length > 1 ? 's' : ''})` : ''}`}</Button>
            {files.length > 0 && !busy && <Button variant="ghost" onClick={() => setFiles([])}>Clear</Button>}
          </div>
          <p className="hint">Tips: faces should be clearly visible and well lit. You can upload several photos of the same class - students found more than once are marked only once.</p>
        </Card>
      )}

      {tab === 'camera' && (
        <Card>
          <video ref={video} autoPlay muted playsInline className="camera" />
          <div className="actions">
            {!cameraOn ? <Button onClick={startCamera}>Start camera</Button> : (
              <>
                <Button onClick={scanOnce} disabled={!slotId}>Scan now</Button>
                <label className="check"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Scan automatically every 4 seconds</label>
                <Button variant="ghost" onClick={stopCamera}>Stop camera</Button>
              </>
            )}
          </div>
          {cameraNote && <p className="hint">{cameraNote}</p>}
          <p className="hint">Every face in view is recognised in one scan. A student is marked once per period, however often the camera sees them.</p>
        </Card>
      )}

      {result && <ResultCard result={result} />}

      {roster && (
        <Card className="mt">
          <div className="tt-title">
            <div>
              <h3>Class list · {roster.slot.year}-{roster.slot.section} · {roster.slot.subject}</h3>
              <p className="hint">{roster.slot.day} · {roster.slot.period_label} · {roster.slot.start_time}-{roster.slot.end_time} · {roster.date}</p>
            </div>
            <Button variant="ghost" onClick={finish} disabled={!roster.counts['Not marked']}>Finish period - mark the rest Absent</Button>
          </div>
          <div className="ta-stats">
            {['Present', 'Absent', 'OD', 'Leave', 'Not marked'].map((k) => (
              <div key={k}><b>{roster.counts[k]}</b><span>{k.toLowerCase()}</span></div>
            ))}
          </div>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Reg. no.</th><th>Name</th><th>Status</th><th>Marked by</th><th>Time</th><th>Change</th></tr></thead>
              <tbody>
                {roster.students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.register_number}</td>
                    <td>{s.name}{!s.face_registered && <small className="hint"> (no face profile)</small>}</td>
                    <td><span className={'pill ' + pillClass(s.status)}>{s.status}</span></td>
                    <td>{s.source ? s.source + (s.match ? ` · ${Math.round(s.match)}%` : '') : '—'}</td>
                    <td>{s.time || '—'}</td>
                    <td>
                      <select className="role-select" value="" onChange={(e) => e.target.value && setStatus(s, e.target.value)}>
                        <option value="">Set…</option>
                        {STATUSES.filter((x) => x !== s.status).map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Page>
  );
}
