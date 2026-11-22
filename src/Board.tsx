import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sb } from './sb'
export type BNode = { id: string; kind: 'e' | 's'; title: string; sub: string }
type P = { x: number; y: number }
const W = 176, H = 88
export default function Board({ inv, nodes, onDirty }: { inv: string; nodes: BNode[]; onDirty: (d: boolean) => void }) {
  const [pos, setPos] = useState<Record<string, P>>({}); const [links, setLinks] = useState<string[][]>([]); const [sel, setSel] = useState(''); const [mode, setMode] = useState(false)
  const [v, setV] = useState({ x: 16, y: 16, k: 1 }); const [ok, setOk] = useState(false)
  const drag = useRef<any>(null); const box = useRef<HTMLDivElement>(null); const first = useRef(true)
  useEffect(() => { sb.from('board_state').select('nodes,links').eq('investigation_id', inv).maybeSingle().then(r => { if (r.data) { setPos(r.data.nodes ?? {}); setLinks(r.data.links ?? []) } setOk(true) }) }, [inv])
  useEffect(() => {
    if (!ok) return; if (first.current) { first.current = false; return }
    onDirty(true); const t = setTimeout(async () => { const { error } = await sb.from('board_state').upsert({ investigation_id: inv, nodes: pos, links }); if (!error) onDirty(false) }, 700)
    return () => clearTimeout(t)
  }, [pos, links, ok])
  useEffect(() => { const el = box.current!; const f = (e: WheelEvent) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : .9) }; el.addEventListener('wheel', f, { passive: false }); return () => el.removeEventListener('wheel', f) }, [])
  const zoom = (m: number) => setV(s => ({ ...s, k: Math.min(2, Math.max(.4, s.k * m)) }))
  const P = (n: BNode): P => pos[n.id] ?? { x: 30 + nodes.filter(m => m.kind === n.kind).indexOf(n) * (W + 30), y: n.kind === 's' ? 30 : 230 }
  const has = (a: string, b: string) => links.some(l => l[0] === a && l[1] === b)
  const tap = (id: string) => {
    if (mode && sel && sel !== id) { const k = [sel, id].sort(); setLinks(l => has(k[0], k[1]) ? l.filter(x => !(x[0] === k[0] && x[1] === k[1])) : [...l, k]) }
    else setSel(id === sel ? '' : id)
  }
  const down = (e: React.PointerEvent, n: BNode) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); const p = P(n); drag.current = { t: 'n', id: n.id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false } }
  const bg = (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { t: 'v', sx: e.clientX, sy: e.clientY, ox: v.x, oy: v.y } }
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return; const dx = e.clientX - d.sx, dy = e.clientY - d.sy
    if (d.t === 'n') { if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true; if (d.moved) setPos(p => ({ ...p, [d.id]: { x: d.ox + dx / v.k, y: d.oy + dy / v.k } })) }
    else setV(s => ({ ...s, x: d.ox + dx, y: d.oy + dy }))
  }
  const up = () => { const d = drag.current; drag.current = null; if (d?.t === 'n' && !d.moved) tap(d.id) }
  const byId = Object.fromEntries(nodes.map(n => [n.id, n])); const live = links.filter(l => byId[l[0]] && byId[l[1]])
  const linked = new Set(live.flat())
  return <div>
    <div className="bar"><button className="btn ghost" aria-pressed={mode} onClick={() => setMode(!mode)} style={mode ? { borderColor: 'var(--red)' } : {}}>{mode ? 'Connecting: pick two cards' : 'Connect cards'}</button>
      <button className="btn ghost" onClick={() => zoom(1.2)} aria-label="Zoom in">+</button><button className="btn ghost" onClick={() => zoom(.83)} aria-label="Zoom out">−</button>
      <button className="btn ghost" onClick={() => setV({ x: 16, y: 16, k: 1 })}>Reset view</button><span className="mute">{live.length} connections</span></div>
    <div ref={box} className="board" onPointerDown={bg} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div style={{ position: 'absolute', transformOrigin: '0 0', transform: `translate(${v.x}px,${v.y}px) scale(${v.k})` }}>
        <svg width="3000" height="2000" style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none' }}><AnimatePresence>
          {live.map(l => { const a = P(byId[l[0]]), b = P(byId[l[1]]), hot = sel === l[0] || sel === l[1]
            return <motion.path key={l.join()} d={`M${a.x + W / 2} ${a.y + H / 2} L${b.x + W / 2} ${b.y + H / 2}`} fill="none" stroke={hot ? '#d33' : '#9b1c1c'} strokeWidth={hot ? 3 : 2} strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 } as any} animate={{ pathLength: 1, opacity: hot ? 1 : .75 } as any} exit={{ pathLength: 0, opacity: 0 } as any} transition={{ duration: .4 }} /> })}
        </AnimatePresence></svg>
        {nodes.map(n => { const p = P(n); return <div key={n.id} role="button" tabIndex={0} aria-label={n.title} onKeyDown={e => e.key === 'Enter' && tap(n.id)} onPointerDown={e => down(e, n)}
          className={`bcard ${n.kind === 's' ? 'sus' : ''} ${linked.has(n.id) ? 'on' : ''} ${sel === n.id ? 'sel' : ''}`} style={{ left: p.x, top: p.y, width: W, minHeight: H }}>
          <b>{n.title}</b><div className="mute" style={{ fontSize: 13 }}>{n.sub}</div></div> })}
      </div></div>
    <p className="mute" style={{ fontSize: 14 }}>Drag cards to arrange them, drag the background to pan, scroll to zoom. Turn on Connect, select a card, then select another to link or unlink them. Changes save automatically.</p></div>
}
