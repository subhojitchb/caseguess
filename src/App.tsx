import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { sb, Case } from './sb'
import Play from './Play'

export default function App() {
  const [session, setSession] = useState<Session | null>(null); const [ready, setReady] = useState(false)
  const [open, setOpen] = useState<Case | null>(null)
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s)); return () => data.subscription.unsubscribe()
  }, [])
  if (!ready) return <div className="wrap mute">Loading…</div>
  if (!session) return <SignIn />
  return <div className="wrap">
    <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2>CASEGUESS</h2><button className="btn ghost" onClick={() => sb.auth.signOut()}>Sign out</button></div>
    <AnimatePresence mode="wait"><motion.div key={open?.id ?? 'home'} initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .45 }}>
      {open ? <Play c={open} uid={session.user.id} back={() => setOpen(null)} /> : <Home uid={session.user.id} pick={setOpen} />}
    </motion.div></AnimatePresence></div>
}

function SignIn() {
  const [err, setErr] = useState('')
  const go = async (provider: 'google' | 'apple') => { const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } }); if (error) setErr(error.message) }
  return <div className="wrap hero" style={{ paddingTop: '14vh' }}>
    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9 }}>CASEGUESS</motion.h1>
    <p style={{ fontSize: 22 }}>Every crime leaves a trail. Can you find it?</p>
    <p className="mute">Examine the evidence, question the details and uncover the truth.</p>
    <button className="btn" onClick={() => go('google')}>Continue with Google</button>{' '}
    <button className="btn ghost" onClick={() => go('apple')}>Continue with Apple</button>
    {err && <p role="alert" style={{ color: '#e07a7a' }}>{err}</p>}</div>
}

function Home({ uid, pick }: { uid: string; pick: (c: Case) => void }) {
  const [cases, setCases] = useState<Case[] | null>(null); const [me, setMe] = useState<any>(null); const [lb, setLb] = useState<any[]>([])
  useEffect(() => {
    sb.from('cases').select('*').order('number').then(r => setCases(r.data ?? []))
    sb.from('profiles').select('display_name,xp,cases_solved,attempts').eq('id', uid).single().then(r => setMe(r.data))
    sb.from('leaderboard').select('*').limit(10).then(r => setLb(r.data ?? []))
  }, [uid])
  const lvl = Math.floor((me?.xp ?? 0) / 500) + 1
  return <>
    <div className="panel"><h3>Welcome, {me?.display_name ?? '…'}</h3>
      <span className="mute">Level {lvl} · {me?.xp ?? 0} XP · {me?.cases_solved ?? 0} solved · accuracy {me?.attempts ? Math.round(100 * me.cases_solved / me.attempts) : 0}%</span></div>
    <h3>Case files</h3>
    {cases === null ? <div className="grid">{[0,1,2].map(i => <div key={i} className="panel skel" />)}</div> : cases.length === 0 ? <div className="panel mute">No cases yet. Run supabase/seed.sql.</div> :
      <div className="grid">{cases.map(c => <button key={c.id} className="panel" style={{ textAlign: 'left', cursor: 'pointer', color: 'inherit' }} onClick={() => pick(c)}>
        <div className="mute">Case #{String(c.number).padStart(3, '0')} · {c.difficulty}</div><h3>{c.title}</h3><div className="mute">{c.category}, about {c.est_minutes} min</div></button>)}</div>}
    <h3 style={{ marginTop: 24 }}>Leaderboard</h3>
    <div className="panel">{lb.length === 0 ? <span className="mute">No ranked detectives yet.</span> : lb.map((r, i) => <div key={i}>{i + 1}. {r.display_name} <span className="mute">{r.xp} XP</span></div>)}</div></>
}

