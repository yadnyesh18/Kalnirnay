import { useState, useEffect } from 'react'

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444']

function storageKey(user) {
  return `kn_bento_${user?.telegram_id || user?.email || 'guest'}`
}

export default function BentoPlanning({ user }) {
  const [subjects, setSubjects] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', progress: 0, color: COLORS[0], target: '' })

  useEffect(() => {
    const saved = localStorage.getItem(storageKey(user))
    if (saved) setSubjects(JSON.parse(saved))
  }, [user])

  const save = (updated) => {
    setSubjects(updated)
    localStorage.setItem(storageKey(user), JSON.stringify(updated))
  }

  const openAdd = () => {
    setForm({ name: '', progress: 0, color: COLORS[subjects.length % COLORS.length], target: '' })
    setEditId(null)
    setShowAdd(true)
  }

  const openEdit = (s) => {
    setForm({ name: s.name, progress: s.progress, color: s.color, target: s.target || '' })
    setEditId(s.id)
    setShowAdd(true)
  }

  const submit = () => {
    if (!form.name.trim()) return
    if (editId) {
      save(subjects.map(s => s.id === editId ? { ...s, ...form, progress: Number(form.progress) } : s))
    } else {
      save([...subjects, { id: Date.now().toString(), ...form, progress: Number(form.progress) }])
    }
    setShowAdd(false)
  }

  const deleteSubject = (id) => save(subjects.filter(s => s.id !== id))

  const updateProgress = (id, val) => {
    save(subjects.map(s => s.id === id ? { ...s, progress: Math.min(100, Math.max(0, val)) } : s))
  }

  const totalAvg = subjects.length
    ? Math.round(subjects.reduce((a, s) => a + s.progress, 0) / subjects.length)
    : 0

  return (
    <div className="bp-root">

      {/* Header row */}
      <div className="bp-header">
        <div className="bp-header-left">
          {subjects.length > 0 && (
            <div className="bp-overall">
              <div className="bp-overall-bar">
                <div className="bp-overall-fill" style={{ width: `${totalAvg}%` }} />
              </div>
              <span className="bp-overall-pct">{totalAvg}% overall</span>
            </div>
          )}
        </div>
        <button className="bp-add-btn" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Subject
        </button>
      </div>

      {/* Empty state */}
      {subjects.length === 0 && (
        <div className="bp-empty">
          <div className="bp-empty-icon">📚</div>
          <p>No subjects yet.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Add your subjects to start tracking progress.</p>
          <button className="bp-add-btn" style={{ marginTop: '1rem' }} onClick={openAdd}>Add your first subject</button>
        </div>
      )}

      {/* Bento grid */}
      {subjects.length > 0 && (
        <div className="bp-grid">
          {subjects.map((s, i) => (
            <div key={s.id} className={`bp-card ${i === 0 && subjects.length > 2 ? 'bp-card--wide' : ''}`}>
              <div className="bp-card-top">
                <div className="bp-card-dot" style={{ background: s.color }} />
                <span className="bp-card-name">{s.name}</span>
                <div className="bp-card-actions">
                  <button className="bp-icon-btn" onClick={() => openEdit(s)} title="Edit">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="bp-icon-btn bp-icon-delete" onClick={() => deleteSubject(s.id)} title="Delete">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>

              <div className="bp-card-pct" style={{ color: s.color }}>{s.progress}%</div>

              <div className="bp-card-bar-wrap">
                <div className="bp-card-bar">
                  <div className="bp-card-fill" style={{ width: `${s.progress}%`, background: s.color }} />
                </div>
              </div>

              {s.target && <div className="bp-card-target">Target: {s.target}</div>}

              {/* Quick +/- buttons */}
              <div className="bp-card-controls">
                <button className="bp-ctrl-btn" onClick={() => updateProgress(s.id, s.progress - 5)}>−5</button>
                <input
                  type="range"
                  min="0" max="100" value={s.progress}
                  className="bp-slider"
                  style={{ '--thumb-color': s.color }}
                  onChange={e => updateProgress(s.id, Number(e.target.value))}
                />
                <button className="bp-ctrl-btn" onClick={() => updateProgress(s.id, s.progress + 5)}>+5</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showAdd && (
        <div className="bp-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="bp-modal" onClick={e => e.stopPropagation()}>
            <div className="bp-modal-header">
              <h3>{editId ? 'Edit Subject' : 'Add Subject'}</h3>
              <button className="bp-modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>

            <div className="bp-modal-body">
              <div className="bp-field">
                <label className="bp-label">Subject Name *</label>
                <input className="bp-input" placeholder="e.g. Data Structures" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
              </div>

              <div className="bp-field">
                <label className="bp-label">Progress ({form.progress}%)</label>
                <input type="range" min="0" max="100" value={form.progress}
                  className="bp-slider bp-slider--modal"
                  style={{ '--thumb-color': form.color }}
                  onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} />
              </div>

              <div className="bp-field">
                <label className="bp-label">Target (optional)</label>
                <input className="bp-input" placeholder="e.g. Complete by May 10" value={form.target}
                  onChange={e => setForm(f => ({ ...f, target: e.target.value }))} />
              </div>

              <div className="bp-field">
                <label className="bp-label">Color</label>
                <div className="bp-colors">
                  {COLORS.map(c => (
                    <button key={c} className={`bp-color-dot ${form.color === c ? 'selected' : ''}`}
                      style={{ background: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
                  ))}
                </div>
              </div>
            </div>

            <div className="bp-modal-footer">
              <button className="bp-save-btn" onClick={submit}>{editId ? 'Save Changes' : 'Add Subject'}</button>
              <button className="bp-cancel-btn" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
