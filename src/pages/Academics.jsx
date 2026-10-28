import { useEffect, useState, useRef } from 'react';
import api, { errorMessage, downloadMarksheetFile, uploadMarksheetFile } from '../services/api';
import { Card, Button, Input, Select, Page, Table, Stat, Alert } from '../components/UI';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import {
  Award, BookOpen, CheckCircle, Clock, FileSpreadsheet, FileText,
  AlertTriangle, UploadCloud, RefreshCw, Send, CheckSquare, History,
  ChevronRight, Layers, Sliders, ArrowUpRight, Edit2, Trash2, Plus,
  RotateCcw, Check, X, GraduationCap, Users, Save, Eye
} from 'lucide-react';

export function StudentAcademics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSem, setActiveSem] = useState(1);
  const [studentMarksheets, setStudentMarksheets] = useState([]);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [corrSubjectId, setCorrSubjectId] = useState('');
  const [corrIssueType, setCorrIssueType] = useState('Internal Marks Discrepancy');
  const [corrDescription, setCorrDescription] = useState('');
  const [corrSubmitting, setCorrSubmitting] = useState(false);
  const [corrMsg, setCorrMsg] = useState({ text: '', type: 'info' });

  const loadPerformance = () => {
    setLoading(true);
    api.get('/academics/my-performance')
      .then(res => {
        setData(res.data);
        setError('');
      })
      .catch(err => setError(errorMessage(err, 'Failed to load academic records')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPerformance();
  }, []);

  useEffect(() => {
    api.get(`/academics/marksheets?semester=${activeSem}`)
      .then(res => setStudentMarksheets(res.data.marksheets || []))
      .catch(() => {});
  }, [activeSem]);

  const handleCorrectionSubmit = (e) => {
    e.preventDefault();
    if (!corrDescription.trim()) {
      setCorrMsg({ text: 'Please enter details describing the discrepancy.', type: 'error' });
      return;
    }
    setCorrSubmitting(true);
    setCorrMsg({ text: '', type: 'info' });
    api.post('/academics/correction-request', {
      semester: activeSem,
      subject_id: corrSubjectId ? parseInt(corrSubjectId) : null,
      issue_type: corrIssueType,
      description: corrDescription
    })
      .then(res => {
        setCorrMsg({ text: res.data.message || 'Correction request submitted to Class Advisor.', type: 'success' });
        setCorrDescription('');
        setTimeout(() => {
          setCorrectionModalOpen(false);
          setCorrMsg({ text: '', type: 'info' });
        }, 1800);
      })
      .catch(err => {
        setCorrMsg({ text: errorMessage(err, 'Failed to submit correction request'), type: 'error' });
      })
      .finally(() => setCorrSubmitting(false));
  };

  if (loading) return <div className="loading-state"><RefreshCw className="spin" size={28}/> Loading academic performance records...</div>;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!data) return null;

  const currentSemData = data.semesters.find(s => s.semester === activeSem) || data.semesters[0];
  const arrears = data.arrears || { original_count: 0, cleared_count: 0, pending_count: 0, original_arrears: [], cleared_arrears: [], pending_arrears: [] };

  return (
    <Page
      title="Academic Performance & Records"
      subtitle={`Student: ${data.student.name} (${data.student.register_number}) — Dept of ${data.student.department}`}
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCorrectionModalOpen(true)}>
            <AlertTriangle size={15} className="text-amber-400 mr-1"/> Request Correction
          </Button>
          <Button variant="secondary" onClick={loadPerformance}>
            <RefreshCw size={16}/> Refresh Records
          </Button>
        </div>
      }
    >
      {/* Overview Stats */}
      <div className="stats-grid">
        <Stat
          label="Cumulative CGPA"
          value={data.cumulative_cgpa > 0 ? Number(data.cumulative_cgpa).toFixed(2) : 'N/A'}
          icon={<Award size={24}/>}
        />
        <Stat
          label="Active Semester"
          value={`Semester ${activeSem}`}
          icon={<BookOpen size={24}/>}
        />
        <Stat
          label="Pending Arrears"
          value={arrears.pending_count}
          icon={<AlertTriangle size={24} className={arrears.pending_count > 0 ? 'text-amber-500' : ''}/>}
        />
        <Stat
          label="Cleared Arrears"
          value={arrears.cleared_count}
          icon={<CheckCircle size={24} className="text-emerald-500"/>}
        />
      </div>

      {/* Arrears Summary Alert Banner if any arrears exist */}
      {arrears.original_count > 0 && (
        <Card className="arrear-banner mb-6 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={22} className={arrears.pending_count > 0 ? 'text-amber-400' : 'text-emerald-400'}/>
            <div>
              <h3 className="font-semibold text-base">Arrears Tracking Summary</h3>
              <p className="text-sm text-slate-300">
                <strong>{arrears.original_count}</strong> original arrear(s) recorded across semesters.
                {' '}<span className="text-emerald-400 font-medium">{arrears.cleared_count} cleared</span>,
                {' '}<span className={arrears.pending_count > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>{arrears.pending_count} currently pending.</span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Semester Tab Switcher */}
      <div className="tab-nav mb-6 flex gap-2 border-b border-slate-700/60 pb-3">
        {[1, 2, 3, 4].map(s => {
          const semInfo = data.semesters.find(x => x.semester === s);
          return (
            <button
              key={s}
              type="button"
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                activeSem === s ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
              onClick={() => setActiveSem(s)}
            >
              <span>Semester {s}</span>
              {semInfo?.sgpa > 0 && (
                <span className="text-xs bg-indigo-900/80 px-1.5 py-0.5 rounded border border-indigo-400/30">
                  SGPA: {Number(semInfo.sgpa).toFixed(2)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Semester Details Card */}
      <Card className="mb-6">
        <div className="p-4 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Semester {activeSem} Results</h3>
            <p className="text-xs text-slate-400">
              Credits Registered: <b>{currentSemData?.credits_registered || 0}</b> | Credits Earned: <b>{currentSemData?.credits_earned || 0}</b>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <small className="text-xs text-slate-400 block">Semester SGPA</small>
              <strong className="text-xl text-indigo-400">{currentSemData?.sgpa > 0 ? Number(currentSemData.sgpa).toFixed(2) : 'Pending'}</strong>
            </div>
            <div className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              currentSemData?.result === 'PASS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              currentSemData?.result === 'RA' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
              'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {currentSemData?.result || 'PENDING'}
            </div>
          </div>
        </div>

        {/* Subjects Table */}
        <Table
          heads={['Code', 'Subject Name', 'Credits', 'Internal (Max)', 'External (Max)', 'Total (100)', 'Grade', 'Grade Pt', 'Result']}
          rows={(currentSemData?.subjects || []).map(sub => [
            <span key="code" className="font-mono text-indigo-300">{sub.code}</span>,
            <span key="name" className="font-medium text-slate-200">{sub.name}</span>,
            sub.credits,
            sub.internal_marks ?? '-',
            sub.external_marks !== null ? sub.external_marks : <span className="text-slate-500 italic">Pending</span>,
            <strong>{sub.total_marks ?? '-'}</strong>,
            <span key="grade" className={`font-bold px-2 py-0.5 rounded text-xs ${
              sub.grade === 'O' || sub.grade === 'A+' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
              sub.grade === 'RA' ? 'bg-rose-950 text-rose-300 border border-rose-700' :
              'bg-slate-800 text-slate-300'
            }`}>{sub.grade || '-'}</span>,
            sub.grade_point ?? '-',
            <span key="result" className={`text-xs font-semibold px-2 py-0.5 rounded ${
              sub.result === 'Pass' ? 'text-emerald-400 bg-emerald-500/10' :
              sub.result === 'Fail' ? 'text-rose-400 bg-rose-500/10' :
              'text-amber-400 bg-amber-500/10'
            }`}>{sub.result}</span>
          ])}
        />
      </Card>

      {/* Semester Marksheets Download Section */}
      {studentMarksheets.length > 0 && (
        <Card className="mb-6">
          <div className="p-4 border-b border-slate-700/60 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-indigo-400"/> Semester {activeSem} Official Marksheets
              </h3>
              <p className="text-xs text-slate-400">Download officially uploaded course and semester marksheets</p>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
              {studentMarksheets.length} file(s) available
            </span>
          </div>
          <Table
            heads={['Filename', 'Type', 'Subject / Assessment', 'Version', 'Date', 'Action']}
            rows={studentMarksheets.map(m => [
              <span key="fn" className="font-mono text-xs text-indigo-300 font-medium">{m.original_filename}</span>,
              <span key="tp" className="uppercase text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{m.file_type}</span>,
              m.subject_code ? `${m.subject_code} (${m.assessment_type})` : m.assessment_type,
              <span key="v" className="text-xs font-bold text-amber-400">v{m.version}</span>,
              m.upload_date ? new Date(m.upload_date).toLocaleDateString() : '—',
              <Button key="dl" variant="secondary" className="text-xs py-1 px-2" onClick={() => downloadMarksheetFile(m.id, m.original_filename)}>
                Download
              </Button>
            ])}
          />
        </Card>
      )}

      {/* Arrears Breakdown Table */}
      {arrears.original_count > 0 && (
        <Card>
          <div className="p-4 border-b border-slate-700/60">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <History size={18} className="text-indigo-400"/> Detailed Arrears History
            </h3>
          </div>
          <Table
            heads={['Origin Semester', 'Subject Code', 'Subject Title', 'Status', 'Cleared In', 'Record Date']}
            rows={arrears.original_arrears.map(arr => [
              `Semester ${arr.semester_origin}`,
              <span key="code" className="font-mono text-indigo-300">{arr.subject_code}</span>,
              arr.subject_name,
              <span key="st" className={`font-semibold text-xs px-2 py-0.5 rounded ${
                arr.status === 'Cleared' ? 'text-emerald-400 bg-emerald-500/20' : 'text-rose-400 bg-rose-500/20'
              }`}>{arr.status}</span>,
              arr.cleared_in_semester ? `Semester ${arr.cleared_in_semester}` : <span className="text-slate-500">Currently Pending</span>,
              arr.created_at ? new Date(arr.created_at).toLocaleDateString() : '-'
            ])}
          />
        </Card>
      )}

      {/* Student Correction Request Modal */}
      {correctionModalOpen && (
        <Modal title="Request Academic Mark Correction" onClose={() => setCorrectionModalOpen(false)}>
          <form onSubmit={handleCorrectionSubmit} className="space-y-4 p-2">
            <p className="text-xs text-slate-300">
              Submit a formal mark review request to your Class Advisor for <strong>Semester {activeSem}</strong>.
            </p>

            {corrMsg.text && (
              <Alert type={corrMsg.type}>{corrMsg.text}</Alert>
            )}

            <Select
              label="Subject"
              value={corrSubjectId}
              onChange={e => setCorrSubjectId(e.target.value)}
            >
              <option value="">General Semester Discrepancy</option>
              {(currentSemData?.subjects || []).map(s => (
                <option key={s.code} value={s.id || ''}>
                  {s.code} — {s.name}
                </option>
              ))}
            </Select>

            <Select
              label="Issue Type"
              value={corrIssueType}
              onChange={e => setCorrIssueType(e.target.value)}
            >
              <option value="Internal Marks Discrepancy">Internal Marks Discrepancy</option>
              <option value="External Marks Missing">External Marks Missing</option>
              <option value="Attendance Credit Discrepancy">Attendance Credit Discrepancy</option>
              <option value="Calculation / Totaling Error">Calculation / Totaling Error</option>
              <option value="Other">Other Academic Issue</option>
            </Select>

            <label className="field">
              <span>Description & Details *</span>
              <textarea
                rows={3}
                required
                className="w-full p-2.5 rounded bg-slate-900 border border-slate-700 text-white text-sm"
                value={corrDescription}
                onChange={e => setCorrDescription(e.target.value)}
                placeholder="Explain the specific mark discrepancy or adjustment needed..."
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setCorrectionModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={corrSubmitting}>
                {corrSubmitting ? <RefreshCw className="spin mr-1" size={16}/> : <Send size={16} className="mr-1"/>}
                {corrSubmitting ? 'Submitting...' : 'Submit to Class Advisor'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Page>
  );
}

export function StaffAcademics() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(user?.is_class_advisor ? 'class-records' : 'marks');
  const [semester, setSemester] = useState(4);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  const advYear = user?.advisor_class ? user.advisor_class.split('-')[0].trim() : 'III';
  const advSec = user?.advisor_class && user.advisor_class.includes('-') ? user.advisor_class.split('-')[1].trim() : 'A';
  const [year, setYear] = useState(advYear || 'III');
  const [section, setSection] = useState(advSec || 'A');

  const [marksRecords, setMarksRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ text: '', type: 'info' });

  // Class records state for Class Advisors and Staff
  const [classRecords, setClassRecords] = useState([]);
  const [classSummary, setClassSummary] = useState(null);
  const [classLoading, setClassLoading] = useState(false);
  const [classError, setClassError] = useState('');
  const [classLoaded, setClassLoaded] = useState(false);
  const [studentModal, setStudentModal] = useState(null);

  // Workflow submissions state
  const [workflows, setWorkflows] = useState([]);
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');

  // Marksheets state
  const [marksheets, setMarksheets] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadAssessment, setUploadAssessment] = useState('Internal Assessment 1');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const uploadFileInputRef = useRef(null);

  // Submit to advisor modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [staffNotes, setStaffNotes] = useState('');
  const [assessmentName, setAssessmentName] = useState('Internal Assessment 1');

  // Load subjects for chosen semester
  useEffect(() => {
    api.get(`/academics/subjects?semester=${semester}`)
      .then(res => {
        setSubjects(res.data.subjects || []);
        if (res.data.subjects?.length) {
          setSelectedSubjectId(String(res.data.subjects[0].id));
        } else {
          setSelectedSubjectId('');
        }
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to fetch subjects'), type: 'error' }));
  }, [semester]);

  // Load marks records for chosen subject & semester
  const loadMarks = () => {
    if (!selectedSubjectId) {
      setAlertMsg({ text: 'Please select a subject to load marks.', type: 'error' });
      return;
    }
    setLoading(true);
    setAlertMsg({ text: '', type: 'info' });
    api.get(`/academics/marks?semester=${semester}&subject_id=${selectedSubjectId}&section=${section}&year=${year}`)
      .then(res => {
        setMarksRecords(res.data.records || []);
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to load marks'), type: 'error' }))
      .finally(() => setLoading(false));
  };

  const loadClassRecords = () => {
    setClassLoading(true);
    setClassError('');
    api.get(`/academics/class-records?year=${year}&section=${section}&semester=${semester}`)
      .then(res => {
        setClassRecords(res.data.records || []);
        setClassSummary({
          total: res.data.total_students || 0,
          passed: res.data.passed_count || 0,
          arrears: res.data.arrear_students_count || 0,
          total_pending_arrears: res.data.total_pending_arrears_count ?? (res.data.summary?.total_pending_arrears) ?? 0
        });
        setClassLoaded(true);
      })
      .catch(err => {
        setClassError(errorMessage(err, 'Failed to load class records'));
        setClassLoaded(true);
      })
      .finally(() => setClassLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'marks') {
      loadMarks();
    } else if (activeTab === 'class-records') {
      loadClassRecords();
    } else if (activeTab === 'workflow') {
      loadWorkflows();
    } else if (activeTab === 'marksheets') {
      loadMarksheets();
    }
  }, [selectedSubjectId, semester, section, year, activeTab]);

  const loadWorkflows = () => {
    api.get('/academics/workflow/list')
      .then(res => setWorkflows(res.data.workflows || []))
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to load workflows'), type: 'error' }));
  };

  const loadMarksheets = () => {
    api.get(`/academics/marksheets?semester=${semester}`)
      .then(res => setMarksheets(res.data.marksheets || []))
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to load marksheets'), type: 'error' }));
  };

  const [recalculating, setRecalculating] = useState(false);

  const handleMarkChange = (index, field, value) => {
    const next = [...marksRecords];
    const val = value === '' ? '' : parseFloat(value) || 0;
    next[index][field] = val;

    // Recalculate total
    const intern = parseFloat(next[index].internal_marks) || 0;
    const extern = parseFloat(next[index].external_marks) || 0;
    const tot = intern + extern;
    next[index].total_marks = tot;

    // Live grade estimate based on total or scaled internal percentage
    const intMax = currentSubjectObj?.internal_max || 40;
    const totMax = currentSubjectObj?.total_max || 100;
    let percentage = 0;
    if (next[index].external_marks !== '' && next[index].external_marks !== null && next[index].external_marks !== undefined) {
      percentage = (tot / totMax) * 100;
    } else {
      percentage = intMax > 0 && intMax < 100 ? (intern / intMax) * 100 : intern;
    }

    if (percentage >= 91) { next[index].grade = 'O'; next[index].result = 'Pass'; }
    else if (percentage >= 81) { next[index].grade = 'A+'; next[index].result = 'Pass'; }
    else if (percentage >= 71) { next[index].grade = 'A'; next[index].result = 'Pass'; }
    else if (percentage >= 61) { next[index].grade = 'B+'; next[index].result = 'Pass'; }
    else if (percentage >= 50) { next[index].grade = 'B'; next[index].result = 'Pass'; }
    else { next[index].grade = 'RA'; next[index].result = 'Fail'; }

    setMarksRecords(next);
  };

  const saveMarksBatch = () => {
    setSaving(true);
    api.post('/academics/marks/batch', {
      subject_id: parseInt(selectedSubjectId),
      semester: parseInt(semester),
      marks: marksRecords.map(r => ({
        student_id: r.student_id,
        internal_marks: r.internal_marks,
        external_marks: r.external_marks === '' ? null : r.external_marks
      }))
    })
      .then(res => {
        setAlertMsg({ text: res.data.message || 'Marks saved and calculated successfully.', type: 'success' });
        loadMarks();
        loadClassRecords();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to save marks'), type: 'error' }))
      .finally(() => setSaving(false));
  };

  const handleRecalculate = () => {
    setRecalculating(true);
    setAlertMsg({ text: '', type: 'info' });
    api.post('/academics/recalculate', { year, section, semester })
      .then(res => {
        setAlertMsg({ text: res.data.message || `Recalculated Sem ${semester} SGPA and arrears.`, type: 'success' });
        loadClassRecords();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Recalculation failed'), type: 'error' }))
      .finally(() => setRecalculating(false));
  };

  const deleteMarksheet = (uploadId, filename) => {
    if (!window.confirm(`Are you sure you want to remove marksheet file "${filename}"? This action cannot be undone.`)) return;
    api.delete(`/academics/marksheets/${uploadId}`)
      .then(res => {
        setAlertMsg({ text: res.data.message || `Removed marksheet file ${filename}.`, type: 'success' });
        loadMarksheets();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to remove marksheet file'), type: 'error' }));
  };

  const handleRemoveStudentMarks = (record) => {
    const studentName = record.name || record.register_number;
    if (!window.confirm(`Are you sure you want to remove academic marks and semester result for ${studentName} (${record.register_number}) in Semester ${semester}?`)) return;
    api.delete(`/academics/student/${record.student_id}/marks?semester=${semester}`)
      .then(res => {
        setAlertMsg({ text: res.data.message || `Removed marks for ${studentName}.`, type: 'success' });
        loadClassRecords();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to remove marks'), type: 'error' }));
  };

  const handleRemoveSubjectMark = (studentId, subjectId, subjectCode) => {
    if (!window.confirm(`Are you sure you want to remove mark record for subject ${subjectCode}?`)) return;
    api.delete(`/academics/student/${studentId}/marks?semester=${semester}&subject_id=${subjectId}`)
      .then(res => {
        setAlertMsg({ text: res.data.message || `Removed mark for ${subjectCode}.`, type: 'success' });
        setStudentModal(null);
        loadClassRecords();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to remove subject mark'), type: 'error' }));
  };

  const handleClearClassMarks = () => {
    if (!window.confirm(`WARNING: Are you sure you want to remove ALL student marks for Year ${year} - Section ${section} in Semester ${semester}? This action cannot be undone.`)) return;
    api.delete(`/academics/class-records/clear?year=${year}&section=${section}&semester=${semester}`)
      .then(res => {
        setAlertMsg({ text: res.data.message || 'Cleared all class marks.', type: 'success' });
        loadClassRecords();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to clear class marks'), type: 'error' }));
  };

  const submitToAdvisor = (e) => {
    e.preventDefault();
    api.post('/academics/workflow/submit', {
      subject_id: parseInt(selectedSubjectId),
      semester: parseInt(semester),
      section,
      assessment_name: assessmentName,
      staff_notes: staffNotes
    })
      .then(res => {
        setAlertMsg({ text: res.data.message || 'Submitted to Class Advisor.', type: 'success' });
        setSubmitModalOpen(false);
        setActiveTab('workflow');
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Submission failed'), type: 'error' }));
  };

  const openWorkflowDetail = (wfId) => {
    api.get(`/academics/workflow/${wfId}`)
      .then(res => {
        setActiveWorkflow(res.data);
        setWorkflowModalOpen(true);
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to fetch workflow detail'), type: 'error' }));
  };

  const triggerWorkflowAction = (action) => {
    if (!activeWorkflow) return;
    api.post(`/academics/workflow/${activeWorkflow.workflow.id}/action`, {
      action,
      comments: reviewComment
    })
      .then(res => {
        setAlertMsg({ text: res.data.message, type: 'success' });
        setWorkflowModalOpen(false);
        loadWorkflows();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Action failed'), type: 'error' }));
  };

  const handleFileUpload = (e) => {
    if (e) e.preventDefault();
    const file = uploadFile || uploadFileInputRef.current?.files?.[0];
    if (!file) {
      setAlertMsg({ text: 'Please select a file to upload (.xlsx, .csv, .pdf).', type: 'error' });
      return;
    }
    setUploading(true);
    setAlertMsg({ text: '', type: 'info' });
    const form = new FormData();
    form.append('file', file);
    form.append('semester', semester);
    if (selectedSubjectId) form.append('subject_id', selectedSubjectId);
    form.append('assessment_type', uploadAssessment);
    form.append('notes', uploadNotes);
    if (user?.department_id) form.append('department_id', user.department_id);

    uploadMarksheetFile(form)
      .then(res => {
        setAlertMsg({ text: res.data.message || 'Marksheet uploaded successfully.', type: 'success' });
        setUploadFile(null);
        setUploadNotes('');
        if (uploadFileInputRef.current) uploadFileInputRef.current.value = '';
        loadMarksheets();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'File upload failed'), type: 'error' }))
      .finally(() => setUploading(false));
  };

  const importMarksheet = (uploadId) => {
    if (!window.confirm('Import marks from this file directly into student records and calculate SGPA & arrears?')) return;
    api.post(`/academics/marksheets/${uploadId}/import`)
      .then(res => {
        setAlertMsg({ text: res.data.message, type: 'success' });
        loadMarks();
        loadClassRecords();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Import failed'), type: 'error' }));
  };

  const currentSubjectObj = subjects.find(s => String(s.id) === String(selectedSubjectId));
  const isAdvisorOrHigher = user?.is_class_advisor || user?.is_hod || user?.role === 'admin';
  const isAdvisorOrAdmin = user?.is_class_advisor || user?.role === 'admin';

  return (
    <Page
      title="Academic Performance Management"
      subtitle={isAdvisorOrAdmin ? "Subject-wise internal assessment marks entry, workflow approvals, and persistent marksheets" : "View assigned student marks and class performance (View-Only)"}
      actions={
        <div className="flex gap-2">
          {activeTab === 'marks' && isAdvisorOrAdmin && (
            <>
              <Button variant="secondary" onClick={() => setSubmitModalOpen(true)} disabled={!marksRecords.length}>
                <Send size={16}/> Submit to Advisor
              </Button>
              <Button onClick={saveMarksBatch} disabled={saving || !marksRecords.length}>
                {saving ? <RefreshCw className="spin" size={16}/> : <CheckSquare size={16}/>} Save Marks Batch
              </Button>
            </>
          )}
        </div>
      }
    >
      {alertMsg.text && (
        <Alert type={alertMsg.type} className="mb-4">
          <div className="flex justify-between items-center w-full">
            <span>{alertMsg.text}</span>
            <button className="text-xs underline ml-4" onClick={() => setAlertMsg({ text: '', type: 'info' })}>Dismiss</button>
          </div>
        </Alert>
      )}

      {/* Tabs */}
      <div className="tab-nav mb-6 flex flex-wrap gap-2 border-b border-slate-700/60 pb-3">
        <button
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${
            activeTab === 'class-records' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
          onClick={() => { setActiveTab('class-records'); if (!classLoaded) loadClassRecords(); }}
        >
          <Users size={16}/> Class Roster & Records
        </button>
        <button
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${
            activeTab === 'marks' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
          onClick={() => setActiveTab('marks')}
        >
          <BookOpen size={16}/> {isAdvisorOrAdmin ? 'Marks Entry & Editing' : 'View Subject Marks'}
        </button>
        {isAdvisorOrHigher && (
          <button
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${
              activeTab === 'workflow' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            onClick={() => setActiveTab('workflow')}
          >
            <Layers size={16}/> Workflow Submissions
            {workflows.some(w => w.status === 'Submitted') && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </button>
        )}
        {isAdvisorOrAdmin && (
          <button
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${
              activeTab === 'marksheets' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            onClick={() => setActiveTab('marksheets')}
          >
            <FileSpreadsheet size={16}/> Marksheets (.xlsx / .csv / .pdf)
          </button>
        )}
      </div>

      {/* Filter Row */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <Select label="Class (Year)" value={year} onChange={e => setYear(e.target.value)}>
            <option value="I">Year I</option>
            <option value="II">Year II</option>
            <option value="III">Year III</option>
            <option value="IV">Year IV</option>
            <option value="ALL">All Years</option>
          </Select>

          <Select label="Class Section" value={section} onChange={e => setSection(e.target.value)}>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="ALL">All Sections</option>
          </Select>

          <Select label="Semester" value={semester} onChange={e => setSemester(parseInt(e.target.value))}>
            <option value="1">Semester 1 (Year I)</option>
            <option value="2">Semester 2 (Year I)</option>
            <option value="3">Semester 3 (Year II)</option>
            <option value="4">Semester 4 (Year II)</option>
          </Select>

          {activeTab === 'marks' ? (
            <Select
              label="Subject"
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              disabled={!subjects.length}
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name} ({s.credits} Credits)
                </option>
              ))}
            </Select>
          ) : (
            <div className="text-xs text-slate-400 pb-2">
              Viewing full academic roster for <b>Year {year} - Section {section}</b>
            </div>
          )}

          <Button
            variant="secondary"
            onClick={activeTab === 'class-records' ? loadClassRecords : loadMarks}
            disabled={activeTab === 'class-records' ? classLoading : loading}
          >
            <RefreshCw size={16} className={(activeTab === 'class-records' ? classLoading : loading) ? 'spin mr-1' : 'mr-1'}/>
            {activeTab === 'class-records' ? (classLoading ? 'Loading Class Records...' : 'Load Class Record') : (loading ? 'Loading Marks...' : 'Load Class Records')}
          </Button>
        </div>
      </Card>

      {/* TAB 0: CLASS ROSTER & PERFORMANCE */}
      {activeTab === 'class-records' && (
        <Card className="mb-6">
          <div className="p-4 border-b border-slate-700/60 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">
                Year {year !== 'ALL' ? year : 'All'} - Section {section} Academic Performance Records
              </h3>
              <p className="text-xs text-slate-400">
                Official class roster, Semester {semester} SGPA, cumulative CGPA, arrears status and subject breakdown
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAdvisorOrAdmin && (
                <>
                  <Button
                    variant="primary"
                    className="text-xs py-1.5 px-3 flex items-center gap-1.5 shadow"
                    onClick={handleRecalculate}
                    disabled={recalculating || classLoading}
                  >
                    <RefreshCw size={13} className={recalculating ? 'spin mr-1' : 'mr-1'}/>
                    {recalculating ? 'Calculating SGPA & Arrears...' : `Calculate Sem ${semester} SGPA & Arrears`}
                  </Button>
                  <Button
                    variant="danger"
                    className="text-xs py-1.5 px-2.5 flex items-center gap-1"
                    onClick={handleClearClassMarks}
                    disabled={classRecords.length === 0}
                    title={`Remove all marks for this class in Semester ${semester}`}
                  >
                    <Trash2 size={12}/> Clear Class Marks
                  </Button>
                </>
              )}
            </div>
          </div>

          {classSummary && (
            <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap gap-4 text-xs font-medium text-slate-300">
              <span>Total Students: <b className="text-white">{classSummary.total}</b></span>
              <span>Passed: <b className="text-emerald-400">{classSummary.passed}</b></span>
              <span>Students with Arrears: <b className="text-amber-400">{classSummary.arrears}</b></span>
              <span>Total Pending Arrear Subjects: <b className="text-rose-400">{classSummary.total_pending_arrears}</b></span>
            </div>
          )}

          {classError && <div className="p-4"><Alert type="error">{classError}</Alert></div>}

          {classLoading ? (
            <div className="p-8 text-center text-slate-400"><RefreshCw className="spin inline mr-2"/> Loading class academic records for Year {year} Section {section}...</div>
          ) : classRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-700/60 m-4 rounded-lg">
              <Users size={32} className="mx-auto mb-2 opacity-40"/>
              <p className="text-sm font-medium text-slate-300">No students found for Year {year} - Section {section}.</p>
              <p className="text-xs text-slate-500 mt-1">Select another year or section and click "Load Class Record", or check student registrations.</p>
            </div>
          ) : (
            <Table
              heads={['Reg Number', 'Student Name', 'Department', 'Class & Sec', `Sem ${semester} SGPA`, 'Cumulative CGPA', 'Arrears', 'Status', 'Actions']}
              rows={classRecords.map(r => [
                <span key="reg" className="font-mono text-indigo-300 font-semibold">{r.register_number}</span>,
                r.name,
                r.department,
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
                </span>,
                <div key="act" className="flex items-center gap-1.5">
                  <Button variant="secondary" className="text-xs py-1 px-2" onClick={() => setStudentModal(r)}>
                    View Marks <ArrowUpRight size={13}/>
                  </Button>
                  {isAdvisorOrAdmin && (
                    <Button
                      variant="danger"
                      className="text-xs py-1 px-2 flex items-center gap-1"
                      onClick={() => handleRemoveStudentMarks(r)}
                      title={`Remove marks for ${r.name || r.register_number} in Semester ${semester}`}
                    >
                      <Trash2 size={12}/> Remove
                    </Button>
                  )}
                </div>
              ])}
            />
          )}
        </Card>
      )}

      {/* TAB 1: MARKS ENTRY */}
      {activeTab === 'marks' && (
        <Card>
          <div className="p-4 border-b border-slate-700/60 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">
                {currentSubjectObj?.code} — {currentSubjectObj?.name}
              </h3>
              <p className="text-xs text-slate-400">
                Max Internal: <b>{currentSubjectObj?.internal_max || 40}</b> | Max External: <b>{currentSubjectObj?.external_max || 60}</b> | Total: <b>100</b>
              </p>
            </div>
            <div className="text-xs text-slate-400 italic">
              {isAdvisorOrAdmin ? (
                <>Changes update grades in real-time. Click <strong>Save Marks Batch</strong> to persist to database.</>
              ) : (
                <span className="text-amber-400 flex items-center gap-1 font-medium"><Eye size={13}/> View-Only mode: Marks are managed by the Class Advisor.</span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400"><RefreshCw className="spin inline mr-2"/> Loading student list for Year {year} Section {section}...</div>
          ) : marksRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-700/60 m-4 rounded-lg">
              <Users size={32} className="mx-auto mb-2 opacity-40"/>
              <p className="text-sm font-medium text-slate-300">No students found for {year !== 'ALL' ? `Year ${year}` : 'All Years'} - Section {section} in Semester {semester}.</p>
              <p className="text-xs text-slate-500 mt-1">Select another class year or section, or click Load Class Records.</p>
            </div>
          ) : (
            <Table
              heads={['Reg Number', 'Student Name', `Internal Marks (Max ${currentSubjectObj?.internal_max || 40})`, `External Marks (Max ${currentSubjectObj?.external_max || 60})`, 'Total (100)', 'Grade', 'Result']}
              rows={marksRecords.map((rec, i) => [
                <span key="reg" className="font-mono text-indigo-300 font-medium">{rec.register_number}</span>,
                rec.name,
                !isAdvisorOrAdmin ? (
                  <span key="int" className="font-mono text-slate-200 font-semibold px-2">{rec.internal_marks ?? 0}</span>
                ) : (
                  <input
                    key="int"
                    type="number"
                    min="0"
                    max={currentSubjectObj?.internal_max || 40}
                    step="0.5"
                    className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono focus:border-indigo-500"
                    value={rec.internal_marks}
                    onChange={e => handleMarkChange(i, 'internal_marks', e.target.value)}
                  />
                ),
                !isAdvisorOrAdmin ? (
                  <span key="ext" className="font-mono text-slate-300 px-2">{rec.external_marks !== null && rec.external_marks !== undefined ? rec.external_marks : '—'}</span>
                ) : (
                  <input
                    key="ext"
                    type="number"
                    min="0"
                    max={currentSubjectObj?.external_max || 60}
                    step="0.5"
                    placeholder="Optional"
                    className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono focus:border-indigo-500"
                    value={rec.external_marks !== null && rec.external_marks !== undefined ? rec.external_marks : ''}
                    onChange={e => handleMarkChange(i, 'external_marks', e.target.value)}
                  />
                ),
                <strong key="tot" className="text-slate-100">{rec.total_marks}</strong>,
                <span key="gr" className={`px-2 py-0.5 rounded font-bold text-xs ${
                  rec.grade === 'O' || rec.grade === 'A+' ? 'bg-emerald-950 text-emerald-300' :
                  rec.grade === 'RA' ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-300'
                }`}>{rec.grade}</span>,
                <span key="res" className={`text-xs font-semibold ${rec.result === 'Pass' ? 'text-emerald-400' : rec.result === 'Fail' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {rec.result}
                </span>
              ])}
            />
          )}
        </Card>
      )}

      {/* TAB 2: WORKFLOW SUBMISSIONS */}
      {activeTab === 'workflow' && (
        <Card>
          <div className="p-4 border-b border-slate-700/60">
            <h3 className="text-base font-semibold text-white">Staff-to-Advisor Internal Marks Workflow</h3>
            <p className="text-xs text-slate-400">
              Staff submit subject-wise marks to the Class Advisor for review. Class Advisors review, request corrections, or approve to calculate SGPA/CGPA.
            </p>
          </div>
          <Table
            heads={['Semester & Section', 'Subject', 'Submitted By', 'Class Advisor', 'Assessment', 'Status', 'Submitted At', 'Action']}
            rows={workflows.map(wf => [
              `Sem ${wf.semester} (Sec ${wf.section})`,
              <span key="sub" className="font-medium text-slate-200">{wf.subject_code} — {wf.subject_name}</span>,
              wf.staff_name,
              wf.advisor_name,
              wf.assessment_name,
              <span key="st" className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                wf.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                wf.status === 'Verified' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                wf.status === 'Correction Requested' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                wf.status === 'Under Review' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>{wf.status}</span>,
              wf.submitted_at ? new Date(wf.submitted_at).toLocaleDateString() : '-',
              <Button key="act" variant="secondary" className="text-xs py-1 px-2" onClick={() => openWorkflowDetail(wf.id)}>
                View / Review <ArrowUpRight size={14}/>
              </Button>
            ])}
          />
        </Card>
      )}

      {/* TAB 3: PERSISTENT MARKSHEET UPLOADS */}
      {activeTab === 'marksheets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Form - strictly for Class Advisors and Admin */}
          {isAdvisorOrAdmin ? (
            <Card className="p-4">
              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <UploadCloud size={20} className="text-indigo-400"/> Upload Marksheet File
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Upload Excel (.xlsx), CSV (.csv), or PDF (.pdf) marksheets. Only assigned Class Advisors can upload marksheet files for permanent storage.
              </p>
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Choose File (.xlsx, .csv, .pdf) *</label>
                  <input
                    ref={uploadFileInputRef}
                    type="file"
                    accept=".xlsx,.csv,.pdf"
                    required
                    className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                    onChange={e => setUploadFile(e.target.files[0])}
                  />
                  {uploadFile && (
                    <div className="flex items-center justify-between text-xs text-indigo-300 bg-indigo-950/60 p-2 rounded mt-2 border border-indigo-800/60">
                      <span className="truncate max-w-[200px] font-mono">{uploadFile.name}</span>
                      <button
                        type="button"
                        className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold text-[11px]"
                        onClick={() => {
                          setUploadFile(null);
                          if (uploadFileInputRef.current) uploadFileInputRef.current.value = '';
                        }}
                      >
                        <X size={12}/> Cancel Selection
                      </button>
                    </div>
                  )}
                </div>
                <Input
                  label="Assessment Title"
                  value={uploadAssessment}
                  onChange={e => setUploadAssessment(e.target.value)}
                  placeholder="e.g. Internal Assessment 1"
                />
                <Input
                  label="Notes / Description"
                  value={uploadNotes}
                  onChange={e => setUploadNotes(e.target.value)}
                  placeholder="Optional notes or instructions"
                />
                <Button type="submit" disabled={uploading || !uploadFile} className="w-full">
                  {uploading ? <RefreshCw className="spin" size={16}/> : <UploadCloud size={16}/>} Upload Persistently
                </Button>
              </form>
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <AlertTriangle size={36} className="mx-auto mb-3 text-amber-400 opacity-80"/>
              <h3 className="text-sm font-semibold text-white">Upload Restricted</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Marksheet file uploads are permitted <strong>only for Class Advisors</strong>. Regular staff cannot upload marksheet files directly.
              </p>
            </Card>
          )}

          {/* Uploaded Files List */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-4 border-b border-slate-700/60">
                <h3 className="text-base font-semibold text-white">Stored Marksheet Files & Version History</h3>
                <p className="text-xs text-slate-400">
                  Files remain persistently available across refreshes and restarts. Click <strong>Import</strong> to ingest marks directly into database and calculate SGPA/arrears.
                </p>
              </div>
              <Table
                heads={['Filename', 'Type', 'Subject / Assessment', 'Version', 'Uploaded By', 'Actions']}
                rows={marksheets.map(m => [
                  <span key="fn" className="font-mono text-xs text-indigo-300 font-semibold">{m.original_filename}</span>,
                  <span key="type" className="uppercase text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{m.file_type}</span>,
                  <div key="sub">
                    <span className="text-xs font-medium text-slate-200 block">{m.subject_code || 'General'}</span>
                    <small className="text-slate-400">{m.assessment_type}</small>
                  </div>,
                  <span key="ver" className="text-xs font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-700">v{m.version}</span>,
                  m.uploader_name,
                  <div key="act" className="flex flex-wrap gap-1.5 items-center">
                    <Button variant="secondary" className="text-xs py-1 px-2" onClick={() => downloadMarksheetFile(m.id, m.original_filename)}>
                      Download
                    </Button>
                    {(m.file_type === 'xlsx' || m.file_type === 'csv') && isAdvisorOrAdmin && (
                      <Button className="text-xs py-1 px-2" onClick={() => importMarksheet(m.id)}>
                        Import
                      </Button>
                    )}
                    {isAdvisorOrAdmin && (
                      <Button
                        variant="danger"
                        className="text-xs py-1 px-2 flex items-center gap-1"
                        onClick={() => deleteMarksheet(m.id, m.original_filename)}
                        title={`Remove marksheet file ${m.original_filename}`}
                      >
                        <Trash2 size={12}/> Remove
                      </Button>
                    )}
                  </div>
                ])}
              />
            </Card>
          </div>
        </div>
      )}

      {/* Modal: Submit to Class Advisor */}
      {submitModalOpen && (
        <Modal title="Submit Marks to Class Advisor" onClose={() => setSubmitModalOpen(false)}>
          <form onSubmit={submitToAdvisor} className="space-y-4 p-2">
            <p className="text-sm text-slate-300">
              Submit entered marks for <strong>{currentSubjectObj?.code} — {currentSubjectObj?.name}</strong> (Semester {semester}, Section {section}) to the Class Advisor for review.
            </p>
            <Input
              label="Assessment Name"
              value={assessmentName}
              onChange={e => setAssessmentName(e.target.value)}
              placeholder="e.g. Internal Assessment 1"
              required
            />
            <label className="field">
              <span>Staff Notes / Remarks</span>
              <textarea
                rows={3}
                className="w-full p-2.5 rounded bg-slate-900 border border-slate-700 text-white text-sm"
                value={staffNotes}
                onChange={e => setStaffNotes(e.target.value)}
                placeholder="Mention any absent students or considerations..."
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setSubmitModalOpen(false)}>Cancel</Button>
              <Button type="submit"><Send size={16}/> Confirm & Submit</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Workflow Details & Advisor Action */}
      {workflowModalOpen && activeWorkflow && (
        <Modal title={`Marks Workflow: ${activeWorkflow.workflow.subject_code} (Sem ${activeWorkflow.workflow.semester})`} onClose={() => setWorkflowModalOpen(false)}>
          <div className="space-y-4 p-2">
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400">Current Status</p>
                <strong className="text-sm text-indigo-300 font-bold uppercase">{activeWorkflow.workflow.status}</strong>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Staff / Advisor</p>
                <p className="text-xs text-slate-200">{activeWorkflow.workflow.staff_name} → {activeWorkflow.workflow.advisor_name}</p>
              </div>
            </div>

            {activeWorkflow.workflow.staff_notes && (
              <div className="text-xs bg-slate-950 p-3 rounded border border-slate-800">
                <span className="font-semibold text-slate-300 block mb-1">Staff Submission Note:</span>
                <p className="text-slate-400">{activeWorkflow.workflow.staff_notes}</p>
              </div>
            )}

            {/* Audit History Log */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <History size={14}/> Audit Trail & History
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeWorkflow.audit_history.map(item => (
                  <div key={item.id} className="text-xs p-2.5 rounded bg-slate-900 border border-slate-800/80 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-indigo-300">{item.action}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">{item.performed_by}</span>
                      </div>
                      {item.comments && <p className="text-slate-300 mt-1 italic">"{item.comments}"</p>}
                    </div>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Advisor Action Controls */}
            {isAdvisorOrHigher && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <label className="field">
                  <span>Advisor Feedback / Correction Notes</span>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Enter review remarks or corrections required..."
                  />
                </label>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="secondary" className="text-xs" onClick={() => triggerWorkflowAction('start_review')}>
                    Mark Under Review
                  </Button>
                  <Button type="button" className="text-xs bg-rose-600 hover:bg-rose-500" onClick={() => triggerWorkflowAction('request_correction')}>
                    Request Correction
                  </Button>
                  <Button type="button" className="text-xs bg-blue-600 hover:bg-blue-500" onClick={() => triggerWorkflowAction('verify')}>
                    Verify
                  </Button>
                  <Button type="button" className="text-xs bg-emerald-600 hover:bg-emerald-500" onClick={() => triggerWorkflowAction('approve')}>
                    <CheckCircle size={14}/> Approve & Finalize
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {studentModal && (
        <Modal title={`Marks Breakdown: ${studentModal.name} (${studentModal.register_number})`} onClose={() => setStudentModal(null)}>
          <div className="space-y-4 p-2">
            <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded border border-slate-800">
              <span>Class: <b>{studentModal.year}-{studentModal.section}</b></span>
              <span>Dept: <b>{studentModal.department}</b></span>
              <span>Sem {semester} SGPA: <b className="text-white">{studentModal.sgpa ? Number(studentModal.sgpa).toFixed(2) : '0.00'}</b></span>
              <span>CGPA: <b className="text-white">{studentModal.cgpa ? Number(studentModal.cgpa).toFixed(2) : '0.00'}</b></span>
              <span>Arrears: <b className={studentModal.arrears_count > 0 ? 'text-rose-400' : 'text-emerald-400'}>{studentModal.arrears_count}</b></span>
            </div>
            {studentModal.marks?.length ? (
              <Table
                heads={isAdvisorOrAdmin ?
                  ['Subject Code', 'Subject Name', 'Credits', 'Internal', 'External', 'Total', 'Grade', 'Result', 'Action'] :
                  ['Subject Code', 'Subject Name', 'Credits', 'Internal', 'External', 'Total', 'Grade', 'Result']
                }
                rows={studentModal.marks.map((m, idx) => {
                  const baseRow = [
                    <span key="c" className="font-mono text-indigo-300 font-semibold">{m.code}</span>,
                    m.name,
                    m.credits,
                    m.internal_marks !== null && m.internal_marks !== undefined ? m.internal_marks : '-',
                    m.external_marks !== null && m.external_marks !== undefined ? m.external_marks : '-',
                    <strong key="tot">{m.total_marks !== null && m.total_marks !== undefined ? m.total_marks : '-'}</strong>,
                    <span key="g" className="font-bold">{m.grade}</span>,
                    <span key="r" className={`text-xs font-semibold ${m.result === 'Pass' ? 'text-emerald-400' : m.result === 'Fail' ? 'text-rose-400' : 'text-amber-400'}`}>{m.result}</span>
                  ];
                  if (isAdvisorOrAdmin) {
                    baseRow.push(
                      <Button
                        key="del"
                        variant="danger"
                        className="text-xs py-0.5 px-2 flex items-center gap-1"
                        onClick={() => handleRemoveSubjectMark(studentModal.student_id, m.id, m.code)}
                        title={`Remove mark for ${m.code}`}
                      >
                        <Trash2 size={11}/> Remove
                      </Button>
                    );
                  }
                  return baseRow;
                })}
              />
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">No marks entered yet for Semester {semester}.</div>
            )}
            <div className="flex justify-between items-center pt-2">
              {isAdvisorOrAdmin && studentModal.marks?.length > 0 && (
                <Button
                  variant="danger"
                  className="text-xs py-1.5 px-3 flex items-center gap-1.5"
                  onClick={() => {
                    handleRemoveStudentMarks(studentModal);
                    setStudentModal(null);
                  }}
                >
                  <Trash2 size={13}/> Clear All Marks for Sem {semester}
                </Button>
              )}
              <Button variant="secondary" onClick={() => setStudentModal(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </Page>
  );
}

export function AdminAcademicConfig() {
  const [subjects, setSubjects] = useState([]);
  const [gradingRules, setGradingRules] = useState([]);
  const [editedRules, setEditedRules] = useState([]);
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [savingRules, setSavingRules] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [semester, setSemester] = useState(1);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState({ text: '', type: 'info' });

  // Add subject modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSemester, setNewSemester] = useState(1);
  const [newCredits, setNewCredits] = useState(3.0);
  const [newIntMax, setNewIntMax] = useState(40.0);
  const [newExtMax, setNewExtMax] = useState(60.0);
  const [newDeptId, setNewDeptId] = useState('');
  const [newIsElective, setNewIsElective] = useState(false);

  // Edit subject modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editSemester, setEditSemester] = useState(1);
  const [editCredits, setEditCredits] = useState(3.0);
  const [editIntMax, setEditIntMax] = useState(40.0);
  const [editExtMax, setEditExtMax] = useState(60.0);
  const [editDeptId, setEditDeptId] = useState('');
  const [editIsElective, setEditIsElective] = useState(false);
  const [editActive, setEditActive] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get(`/academics/subjects?semester=${semester}`),
      api.get('/academics/grading-rules'),
      api.get('/departments')
    ])
      .then(([subRes, ruleRes, deptRes]) => {
        setSubjects(subRes.data.subjects || []);
        const rules = ruleRes.data.rules || [];
        setGradingRules(rules);
        setEditedRules(JSON.parse(JSON.stringify(rules)));
        setDepartments(deptRes.data.departments || []);
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to load configuration'), type: 'error' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    setNewSemester(semester);
  }, [semester]);

  const handleCreateSubject = (e) => {
    e.preventDefault();
    api.post('/academics/subjects', {
      code: newCode,
      name: newName,
      semester: parseInt(newSemester) || semester,
      credits: parseFloat(newCredits) || 3.0,
      internal_max: parseFloat(newIntMax) || 40.0,
      external_max: parseFloat(newExtMax) || 60.0,
      total_max: (parseFloat(newIntMax) || 40.0) + (parseFloat(newExtMax) || 60.0),
      department_id: newDeptId ? parseInt(newDeptId) : null,
      is_elective: Boolean(newIsElective)
    })
      .then(res => {
        setAlertMsg({ text: res.data.message || 'Subject created and saved to database.', type: 'success' });
        setModalOpen(false);
        setNewCode('');
        setNewName('');
        setNewDeptId('');
        loadData();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to add subject'), type: 'error' }));
  };

  const handleOpenEdit = (sub) => {
    setEditId(sub.id);
    setEditCode(sub.code);
    setEditName(sub.name);
    setEditSemester(sub.semester);
    setEditCredits(sub.credits);
    setEditIntMax(sub.internal_max);
    setEditExtMax(sub.external_max);
    setEditDeptId(sub.department_id ? String(sub.department_id) : '');
    setEditIsElective(Boolean(sub.is_elective));
    setEditActive(sub.active !== false);
    setEditModalOpen(true);
  };

  const handleSaveEditSubject = (e) => {
    e.preventDefault();
    if (!editId) return;

    api.put(`/academics/subjects/${editId}`, {
      code: editCode,
      name: editName,
      semester: parseInt(editSemester),
      credits: parseFloat(editCredits),
      internal_max: parseFloat(editIntMax),
      external_max: parseFloat(editExtMax),
      total_max: parseFloat(editIntMax) + parseFloat(editExtMax),
      department_id: editDeptId ? parseInt(editDeptId) : null,
      is_elective: Boolean(editIsElective),
      active: Boolean(editActive)
    })
      .then(res => {
        setAlertMsg({ text: res.data.message || 'Subject updated permanently in database.', type: 'success' });
        setEditModalOpen(false);
        loadData();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to update subject'), type: 'error' }));
  };

  const handleDeleteSubject = (sub) => {
    if (!window.confirm(`Are you sure you want to remove or archive subject ${sub.code} (${sub.name})? If students have historical marks in this subject, it will be safely archived to preserve historical records.`)) {
      return;
    }

    api.delete(`/academics/subjects/${sub.id}`)
      .then(res => {
        setAlertMsg({ text: res.data.message, type: 'success' });
        loadData();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to delete/archive subject'), type: 'error' }));
  };

  // Grading rules handlers
  const handleRuleChange = (index, field, value) => {
    const updated = [...editedRules];
    if (field === 'min_mark' || field === 'max_mark' || field === 'grade_point') {
      updated[index][field] = parseFloat(value) || 0;
    } else if (field === 'is_pass') {
      updated[index][field] = value === 'true' || value === true;
    } else {
      updated[index][field] = value;
    }
    setEditedRules(updated);
  };

  const handleAddRule = () => {
    const nextOrder = editedRules.length + 1;
    setEditedRules([
      ...editedRules,
      {
        grade_letter: 'C',
        min_mark: 40.0,
        max_mark: 49.0,
        grade_point: 5.0,
        description: 'Average',
        is_pass: true,
        order_index: nextOrder
      }
    ]);
  };

  const handleRemoveRule = (index) => {
    const next = editedRules.filter((_, i) => i !== index);
    setEditedRules(next);
  };

  const handleSaveGradingRules = () => {
    setSavingRules(true);
    api.post('/academics/grading-rules', { rules: editedRules })
      .then(res => {
        setAlertMsg({ text: res.data.message || 'Grading rules saved permanently in the database.', type: 'success' });
        setIsEditingRules(false);
        loadData();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to save grading rules'), type: 'error' }))
      .finally(() => setSavingRules(false));
  };

  const handleResetGradingRules = () => {
    if (!window.confirm('Reset grading scale to the standard 10-point university regulations?')) return;
    setSavingRules(true);
    api.post('/academics/grading-rules/reset')
      .then(res => {
        setAlertMsg({ text: res.data.message || 'Reset to default scale.', type: 'success' });
        setIsEditingRules(false);
        loadData();
      })
      .catch(err => setAlertMsg({ text: errorMessage(err, 'Failed to reset grading rules'), type: 'error' }))
      .finally(() => setSavingRules(false));
  };

  return (
    <Page
      title="Academic Credentials & Curriculum"
      subtitle="Edit and save academic details: semesters, subjects, subject codes, credits, and grading regulations. Changes are persisted permanently in the database."
      actions={
        <Button onClick={() => { setNewSemester(semester); setModalOpen(true); }}>
          <BookOpen size={16}/> Add Subject (Sem {semester})
        </Button>
      }
    >
      {alertMsg.text && (
        <Alert type={alertMsg.type} className="mb-4">
          <div className="flex justify-between items-center w-full">
            <span>{alertMsg.text}</span>
            <button className="text-xs underline ml-4" onClick={() => setAlertMsg({ text: '', type: 'info' })}>Dismiss</button>
          </div>
        </Alert>
      )}

      {/* Institutional Regulations Banner */}
      <Card className="mb-6 p-4 border-l-4 border-l-indigo-500">
        <div className="flex items-start gap-3">
          <Sliders size={22} className="text-indigo-400 mt-0.5"/>
          <div>
            <h3 className="font-semibold text-white text-sm">Configurable Institutional Regulations & Academic Credentials</h3>
            <p className="text-xs text-slate-300 mt-1">
              Official university regulations (Anna University / Autonomous / UGC guidelines) can be updated here by Administrators.
              All future SGPA, CGPA, and grade evaluations dynamically reference this database scale while preserving historical academic transcripts.
            </p>
          </div>
        </div>
      </Card>

      {/* Grading Scale Table */}
      <Card className="mb-6">
        <div className="p-4 border-b border-slate-700/60 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Active 10-Point Grading Scale Regulations</h3>
            <p className="text-xs text-slate-400">Score ranges, letter grades, grade points, and pass requirements</p>
          </div>
          <div className="flex gap-2">
            {!isEditingRules ? (
              <Button variant="secondary" onClick={() => { setEditedRules(JSON.parse(JSON.stringify(gradingRules))); setIsEditingRules(true); }}>
                <Edit2 size={15} className="mr-1"/> Edit Grading Scale
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={handleAddRule} className="text-xs">
                  <Plus size={14} className="mr-1"/> Add Grade Row
                </Button>
                <Button variant="secondary" onClick={handleResetGradingRules} disabled={savingRules} className="text-xs">
                  <RotateCcw size={14} className="mr-1"/> Reset Defaults
                </Button>
                <Button variant="secondary" onClick={() => { setIsEditingRules(false); setEditedRules(JSON.parse(JSON.stringify(gradingRules))); }} className="text-xs">
                  Cancel
                </Button>
                <Button onClick={handleSaveGradingRules} disabled={savingRules} className="text-xs">
                  {savingRules ? <RefreshCw size={14} className="spin mr-1"/> : <Save size={14} className="mr-1"/>}
                  {savingRules ? 'Saving...' : 'Save Grading Scale'}
                </Button>
              </>
            )}
          </div>
        </div>

        {isEditingRules ? (
          <div className="p-4 space-y-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-left">
                  <th className="p-2">Grade Letter</th>
                  <th className="p-2">Min Mark</th>
                  <th className="p-2">Max Mark</th>
                  <th className="p-2">Grade Point</th>
                  <th className="p-2">Description</th>
                  <th className="p-2">Pass Status</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {editedRules.map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-800">
                    <td className="p-2">
                      <input
                        type="text"
                        className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono font-bold text-indigo-300"
                        value={r.grade_letter}
                        onChange={e => handleRuleChange(idx, 'grade_letter', e.target.value.toUpperCase())}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.5"
                        className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                        value={r.min_mark}
                        onChange={e => handleRuleChange(idx, 'min_mark', e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.5"
                        className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                        value={r.max_mark}
                        onChange={e => handleRuleChange(idx, 'max_mark', e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.1"
                        className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                        value={r.grade_point}
                        onChange={e => handleRuleChange(idx, 'grade_point', e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        className="w-36 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                        value={r.description}
                        onChange={e => handleRuleChange(idx, 'description', e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <select
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                        value={r.is_pass ? 'true' : 'false'}
                        onChange={e => handleRuleChange(idx, 'is_pass', e.target.value)}
                      >
                        <option value="true">PASS</option>
                        <option value="false">RE-APPEAR / FAIL</option>
                      </select>
                    </td>
                    <td className="p-2 text-right">
                      <button
                        type="button"
                        className="text-rose-400 hover:text-rose-300 p-1"
                        onClick={() => handleRemoveRule(idx)}
                        title="Remove rule"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Table
            heads={['Grade Letter', 'Score Range (Min - Max)', 'Grade Point', 'Description', 'Status']}
            rows={gradingRules.map(r => [
              <strong key="l" className="font-mono text-indigo-300 text-sm">{r.grade_letter}</strong>,
              `${r.min_mark} — ${r.max_mark}`,
              <span key="gp" className="font-bold text-slate-200">{r.grade_point.toFixed(1)}</span>,
              r.description,
              <span key="st" className={`text-xs font-semibold px-2 py-0.5 rounded ${r.is_pass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {r.is_pass ? 'PASS' : 'RE-APPEAR'}
              </span>
            ])}
          />
        )}
      </Card>

      {/* Curriculum Subjects */}
      <Card>
        <div className="p-4 border-b border-slate-700/60 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Curriculum Subjects by Semester</h3>
            <p className="text-xs text-slate-400">Accredited curriculum subjects, credit values, and assessment limits for Semester {semester}</p>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <button
                key={s}
                type="button"
                className={`px-3 py-1.5 rounded text-xs font-semibold ${
                  semester === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                onClick={() => setSemester(s)}
              >
                Semester {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400"><RefreshCw className="spin inline mr-2"/> Loading curriculum subjects...</div>
        ) : (
          <Table
            heads={['Code', 'Subject Name', 'Department Scope', 'Credits', 'Max Internal', 'Max External', 'Total Max', 'Status', 'Actions']}
            rows={subjects.map(s => [
              <span key="code" className="font-mono font-semibold text-indigo-300">{s.code}</span>,
              s.name,
              s.department_name,
              <strong key="cr" className="text-slate-100">{s.credits}</strong>,
              s.internal_max,
              s.external_max,
              s.total_max,
              <span key="act" className={`text-xs px-2 py-0.5 rounded font-semibold ${s.active !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                {s.active !== false ? 'Active' : 'Archived'}
              </span>,
              <div key="actions" className="flex gap-2">
                <Button variant="secondary" className="text-xs py-1 px-2" onClick={() => handleOpenEdit(s)} title="Edit Subject Details">
                  <Edit2 size={13} className="mr-1"/> Edit
                </Button>
                <button
                  type="button"
                  className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/40"
                  onClick={() => handleDeleteSubject(s)}
                  title="Archive or Delete Subject"
                >
                  <Trash2 size={15}/>
                </button>
              </div>
            ])}
          />
        )}
      </Card>

      {/* Add Subject Modal */}
      {modalOpen && (
        <Modal title={`Add Subject to Semester ${newSemester}`} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleCreateSubject} className="space-y-4 p-2">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Subject Code"
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. CS3401"
                required
              />
              <Select label="Semester" value={newSemester} onChange={e => setNewSemester(parseInt(e.target.value))}>
                <option value="1">Semester 1 (Year I)</option>
                <option value="2">Semester 2 (Year I)</option>
                <option value="3">Semester 3 (Year II)</option>
                <option value="4">Semester 4 (Year II)</option>
              </Select>
            </div>

            <Input
              label="Subject Title / Name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Operating Systems"
              required
            />

            <Select label="Department Scope" value={newDeptId} onChange={e => setNewDeptId(e.target.value)}>
              <option value="">Common / All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </Select>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Credits"
                type="number"
                step="0.5"
                value={newCredits}
                onChange={e => setNewCredits(e.target.value)}
                required
              />
              <Input
                label="Internal Max"
                type="number"
                value={newIntMax}
                onChange={e => setNewIntMax(e.target.value)}
                required
              />
              <Input
                label="External Max"
                type="number"
                value={newExtMax}
                onChange={e => setNewExtMax(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isElectiveNew"
                checked={newIsElective}
                onChange={e => setNewIsElective(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
              />
              <label htmlFor="isElectiveNew" className="text-xs text-slate-300">Professional Elective Subject</label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">Create Subject</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Subject Modal */}
      {editModalOpen && (
        <Modal title={`Edit Subject Details: ${editCode}`} onClose={() => setEditModalOpen(false)}>
          <form onSubmit={handleSaveEditSubject} className="space-y-4 p-2">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Subject Code"
                value={editCode}
                onChange={e => setEditCode(e.target.value.toUpperCase())}
                placeholder="e.g. CS3401"
                required
              />
              <Select label="Semester" value={editSemester} onChange={e => setEditSemester(parseInt(e.target.value))}>
                <option value="1">Semester 1 (Year I)</option>
                <option value="2">Semester 2 (Year I)</option>
                <option value="3">Semester 3 (Year II)</option>
                <option value="4">Semester 4 (Year II)</option>
              </Select>
            </div>

            <Input
              label="Subject Title / Name"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="e.g. Operating Systems"
              required
            />

            <Select label="Department Scope" value={editDeptId} onChange={e => setEditDeptId(e.target.value)}>
              <option value="">Common / All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </Select>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Credits"
                type="number"
                step="0.5"
                value={editCredits}
                onChange={e => setEditCredits(e.target.value)}
                required
              />
              <Input
                label="Internal Max"
                type="number"
                value={editIntMax}
                onChange={e => setEditIntMax(e.target.value)}
                required
              />
              <Input
                label="External Max"
                type="number"
                value={editExtMax}
                onChange={e => setEditExtMax(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-6 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isElectiveEdit"
                  checked={editIsElective}
                  onChange={e => setEditIsElective(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="isElectiveEdit" className="text-xs text-slate-300">Professional Elective</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activeEdit"
                  checked={editActive}
                  onChange={e => setEditActive(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="activeEdit" className="text-xs text-slate-300">Active Curriculum Subject</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes Permanently</Button>
            </div>
          </form>
        </Modal>
      )}
    </Page>
  );
}
