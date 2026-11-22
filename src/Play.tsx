import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { sb, Case } from './sb'
import Board from './Board'
type Suspect = { id: string; name: string; age: number; relation: string; background: string; motive_hint: string; alibi: string; statement: string }
type Ev = { id: string; title: string; location: string; description: string; purpose: string | null }
type Find = { id: string; suspect_id: string; evidence_id: string; finding: string }
type Result = { correct: boolean; score: number; suspect_id: string; motive_idx: number; method_idx: number; explanation: string }
const TABS = ['Scene', 'Suspects', 'Board', 'Journal', 'Accuse']
export default function Play({ c, uid, back }: { c: Case; uid: string; back: () => void }) {
  const [tab, setTab] = useState('Scene'); const [sus, setSus] = useState<Suspect[]>([]); const [ev, setEv] = useState<Ev[] | null>(null); const [inv, setInv] = useState(''); const [got, setGot] = useState<Set<string>>(new Set())
  const [finds, setFinds] = useState<Find[]>([]); const [journal, setJournal] = useState(''); const [bDirty, setBDirty] = useState(false); const [jDirty, setJDirty] = useState(false); const jReady = useRef(false)
  const [pick, setPick] = useState({ s: '', m: '', h: '' }); const [confirm, setConfirm] = useState(false); const [res, setRes] = useState<Result | null>(null); const [err, setErr] = useState('')
  const unsaved = bDirty || jDirty
  useEffect(() => { (async () => {
    const [s, e] = await Promise.all([sb.from('suspects').select('*').eq('case_id', c.id), sb.from('evidence').select('*').eq('case_id', c.id)])
    setSus(s.data ?? []); setEv(e.data ?? [])
    const { data: i } = await sb.from('investigations').upsert({ user_id: uid, case_id: c.id }, { onConflict: 'user_id,case_id' }).select('id').single()
    if (i) { setInv(i.id)
      const [ce, bs] = await Promise.all([sb.from('collected_evidence').select('evidence_id').eq('investigation_id', i.id), sb.from('board_state').select('journal').eq('investigation_id', i.id).maybeSingle()])
      setGot(new Set((ce.data ?? []).map(x => x.evidence_id))); setJournal(bs.data?.journal ?? ''); jReady.current = true }
  })() }, [c.id, uid])
  useEffect(() => { sb.from('contradictions').select('*').eq('case_id', c.id).then(r => setFinds(r.data ?? [])) }, [got.size, c.id])
  useEffect(() => {
    if (!jReady.current || !inv) return; setJDirty(true)
    const t = setTimeout(async () => { const { error } = await sb.from('board_state').upsert({ investigation_id: inv, journal }); if (!error) setJDirty(false) }, 700); return () => clearTimeout(t)
  }, [journal])
  useEffect(() => { const f = (e: BeforeUnloadEvent) => { if (unsaved) e.preventDefault() }; window.addEventListener('beforeunload', f); return () => window.removeEventListener('beforeunload', f) }, [unsaved])
  const leave = () => { if (!unsaved || window.confirm('Your latest changes are still saving. Leave anyway?')) back() }
  const collect = async (id: string) => { if (got.has(id) || !inv) return; const { error } = await sb.from('collected_evidence').insert({ investigation_id: inv, evidence_id: id }); if (!error) setGot(new Set([...got, id])) }
  const submit = async () => {
    const { data, error } = await sb.rpc('submit_accusation', { p_case: c.id, p_suspect: pick.s, p_motive: +pick.m, p_method: +pick.h })
    if (error) setErr(error.message); else setRes(data as Result); setConfirm(false)
  }
  const total = ev?.length ?? 0; const ready = total > 0 && got.size * 2 >= total; const evTitle = (id: string) => ev?.find(x => x.id === id)?.title
  if (res) return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}>
    <h2>{res.correct ? 'Case closed.' : 'Wrong suspect.'}</h2>
    <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>{res.score} XP</motion.h3>
    <motion.div className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}><b>The culprit:</b> {sus.find(x => x.id === res.suspect_id)?.name}<br /><b>Motive:</b> {c.motives[res.motive_idx]}<br /><b>Method:</b> {c.methods[res.method_idx]}</motion.div>
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }}>{res.explanation}</motion.p><button className="btn" onClick={back}>Back to cases</button></motion.div>
  return <>
    <button className="btn ghost" onClick={leave}>Back</button>
    <h2 style={{ marginTop: 14 }}>Case #{String(c.number).padStart(3, '0')}: {c.title}</h2><p>{c.intro}</p>
    <div className="mute" style={{ fontSize: 14 }}>Evidence {got.size}/{total} · Findings {finds.length} · {unsaved ? 'Saving…' : 'All changes saved'}</div>
    <div className="track"><motion.div className="fill" animate={{ width: `${total ? 100 * got.size / total : 0}%` }} /></div>
    <div className="tabs" role="tablist">{TABS.map(t => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === 'Scene' && (ev === null ? <div className="grid">{[0, 1, 2].map(i => <div key={i} className="panel skel" />)}</div> :
      <div className="grid">{ev.map(e => <motion.button layout key={e.id} className={`panel paper ${got.has(e.id) ? 'got' : ''}`} style={{ textAlign: 'left', color: 'inherit', cursor: 'pointer' }} onClick={() => collect(e.id)} whileHover={{ y: -2 }}>
        <h3>{e.title}</h3><div className="mute">{e.location}</div>
        {got.has(e.id) ? <><p>{e.description}</p>{e.purpose && <p className="mute"><i>Why it matters: {e.purpose}</i></p>}</> : <p className="mute">Click to examine</p>}</motion.button>)}</div>)}
    {tab === 'Suspects' && <div className="grid">{sus.map(s => <div key={s.id} className="panel"><h3>{s.name}, {s.age}</h3><div className="mute">{s.relation}</div><p>{s.background}</p><p><b>Motive:</b> {s.motive_hint}</p><p><b>Alibi:</b> {s.alibi}</p><p>Statement: {s.statement}</p>
      {finds.filter(f => f.suspect_id === s.id).map(f => <p key={f.id} className="find"><b>Finding</b> ({evTitle(f.evidence_id)}): {f.finding}</p>)}</div>)}</div>}
    <div style={{ display: tab === 'Board' ? 'block' : 'none' }}>{inv && ev && <Board inv={inv} onDirty={setBDirty} nodes={[...sus.map(s => ({ id: 's:' + s.id, kind: 's' as const, title: s.name, sub: s.relation })), ...ev.filter(e => got.has(e.id)).map(e => ({ id: 'e:' + e.id, kind: 'e' as const, title: e.title, sub: e.location }))]} />}
      {tab === 'Board' && got.size === 0 && <p className="mute">Collect evidence at the scene and it will appear here.</p>}</div>
    {tab === 'Journal' && <div className="panel"><h3>Investigation journal</h3><textarea value={journal} onChange={e => setJournal(e.target.value)} placeholder="Record theories, timelines and doubts. Saved automatically." rows={12} /><h3>Findings so far</h3>
      {finds.length === 0 ? <p className="mute">Collect evidence to uncover how statements hold up.</p> : finds.map(f => <p key={f.id} className="find">{sus.find(s => s.id === f.suspect_id)?.name} · {evTitle(f.evidence_id)}: {f.finding}</p>)}</div>}
    {tab === 'Accuse' && <div className="panel">{!ready ? <p className="mute">Collect at least half the evidence ({got.size}/{total}) before you accuse.</p> : <>
      <label>Who did it?<select value={pick.s} onChange={e => setPick({ ...pick, s: e.target.value })}><option value="">Choose</option>{sus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Motive<select value={pick.m} onChange={e => setPick({ ...pick, m: e.target.value })}><option value="">Choose</option>{c.motives.map((m, i) => <option key={i} value={i}>{m}</option>)}</select></label>
      <label>Method<select value={pick.h} onChange={e => setPick({ ...pick, h: e.target.value })}><option value="">Choose</option>{c.methods.map((m, i) => <option key={i} value={i}>{m}</option>)}</select></label>
      <button className="btn" disabled={!pick.s || !pick.m || !pick.h} onClick={() => setConfirm(true)}>Accuse</button>
      {confirm && <p role="alertdialog">This is final. <button className="btn" onClick={submit}>Confirm accusation</button> <button className="btn ghost" onClick={() => setConfirm(false)}>Cancel</button></p>}
      {err && <p role="alert" style={{ color: '#e07a7a' }}>{err}</p>}</>}</div>}</>
}
