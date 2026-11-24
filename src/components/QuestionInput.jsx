// Renders the answer controls for every question type and reports the player's answer.
// Types: truefalse · choice (2–8 options) · multi (pick all correct) · text (type it) · number (guess) · order (arrange)
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Check, X, ArrowUp, ArrowDown, GripVertical, Send, Loader2 } from 'lucide-react'
import './question-input.css'

export const KIND_LABEL = {
  truefalse: 'True / False',
  choice: 'Multiple choice',
  multi: 'Pick all that apply',
  text: 'Type the answer',
  number: 'Guess the number',
  order: 'Put in order',
}
const LETTERS = 'ABCDEFGH'

// How to show a question's correct answer from a server result
export function answerText(q, res, yes = 'True', no = 'False') {
  if (!res) return ''
  if ((q?.kind || 'truefalse') === 'truefalse') return res.answer ? yes : no
  return res.answer_text || ''
}

export function QuestionHeader({ q, prompt }) {
  return (
    <>
      {q.image ? (
        <img className="qi-image" src={q.image} alt="" loading="eager" />
      ) : (
        q.emoji && <span className="rm-q-emoji">{q.emoji}</span>
      )}
      {q.type && <small className="rm-q-type">{q.type}</small>}
      <h2>{q.item}</h2>
      <p className="muted">{q.prompt || (q.kind && q.kind !== 'truefalse' ? KIND_LABEL[q.kind] : prompt)}</p>
    </>
  )
}

export default function QuestionInput({ q, yes = 'True', no = 'False', disabled, pending, picked, result, onSubmit, keyboard = true }) {
  const kind = q.kind || 'truefalse'
  const locked = disabled || pending || !!result
  const [sel, setSel] = useState(() => (kind === 'multi' ? [] : null))
  const [text, setText] = useState('')
  // Number guesses start empty: a pre-filled midpoint can sit right on the answer
  const [num, setNum] = useState('')
  const [order, setOrder] = useState(() => (q.options || []).map((o) => o.i))
  const [drag, setDrag] = useState(null)

  // reset when the question changes
  useEffect(() => {
    setSel(kind === 'multi' ? [] : null)
    setText('')
    setOrder((q.options || []).map((o) => o.i))
    setNum('')
  }, [q.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = (v) => !locked && onSubmit(v)
  const optText = useMemo(() => Object.fromEntries((q.options || []).map((o) => [o.i, o.t])), [q.options])
  const solution = result?.solution
  const isRight = (i) => (kind === 'choice' ? solution === i : kind === 'multi' ? Array.isArray(solution) && solution.includes(i) : false)

  // Keyboard: ←/→ for true/false, 1–8 for choice
  useEffect(() => {
    if (!keyboard || locked) return
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (kind === 'truefalse') {
        if (e.key === 'ArrowLeft') send(true)
        if (e.key === 'ArrowRight') send(false)
      }
      if (kind === 'choice') {
        const n = Number(e.key)
        const o = q.options?.[n - 1]
        if (o) send(o.i)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (kind === 'truefalse') {
    return (
      <div className="rm-btns">
        <button type="button" className={`btn btn-lg rm-yes ${picked === true ? 'is-picked' : ''}`} disabled={locked} onClick={() => send(true)}>
          {pending && picked === true ? <Loader2 size={18} className="spin" /> : <Check size={20} strokeWidth={2.6} />} {yes}
        </button>
        <button type="button" className={`btn btn-lg rm-no ${picked === false ? 'is-picked' : ''}`} disabled={locked} onClick={() => send(false)}>
          {pending && picked === false ? <Loader2 size={18} className="spin" /> : <X size={20} strokeWidth={2.6} />} {no}
        </button>
      </div>
    )
  }

  if (kind === 'choice' || kind === 'multi') {
    const multi = kind === 'multi'
    const chosen = (i) => (multi ? (result ? picked || [] : sel).includes(i) : (result ? picked : sel) === i)
    return (
      <div className="qi">
        {multi && !result && <p className="qi-hint">Pick {q.pick ? `${q.pick} answers` : 'every correct answer'}</p>}
        <div className={`qi-grid ${q.options.length > 4 ? 'is-many' : ''}`}>
          {q.options.map((o, n) => {
            const st = result ? (isRight(o.i) ? 'is-right' : chosen(o.i) ? 'is-wrong' : 'is-dim') : chosen(o.i) ? 'is-sel' : ''
            return (
              <motion.button
                key={o.i}
                type="button"
                className={`qi-opt ${st}`}
                disabled={locked}
                whileTap={locked ? undefined : { scale: 0.97 }}
                onClick={() => (multi ? setSel((s) => (s.includes(o.i) ? s.filter((x) => x !== o.i) : [...s, o.i])) : (setSel(o.i), send(o.i)))}
              >
                <span className="qi-key">{multi ? <span className={`qi-box ${chosen(o.i) ? 'on' : ''}`}>{chosen(o.i) && <Check size={13} strokeWidth={3} />}</span> : LETTERS[n]}</span>
                <span className="qi-txt">{o.t}</span>
                {result && isRight(o.i) && <Check size={18} className="qi-mark" />}
                {result && !isRight(o.i) && chosen(o.i) && <X size={18} className="qi-mark" />}
                {pending && !multi && sel === o.i && <Loader2 size={16} className="spin qi-mark" />}
              </motion.button>
            )
          })}
        </div>
        {multi && !result && (
          <button type="button" className="btn btn-primary qi-submit" disabled={locked || !sel.length} onClick={() => send(sel)}>
            {pending ? <Loader2 size={16} className="spin" /> : <Send size={16} />} Submit
          </button>
        )}
      </div>
    )
  }

  if (kind === 'text') {
    return (
      <form
        className="qi qi-text"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) send(text.trim())
        }}
      >
        <input value={result ? picked || '' : text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer" disabled={locked} autoFocus maxLength={120} autoComplete="off" aria-label="Your answer" />
        {!result && (
          <button type="submit" className="btn btn-primary" disabled={locked || !text.trim()}>
            {pending ? <Loader2 size={16} className="spin" /> : <Send size={16} />} Submit
          </button>
        )}
      </form>
    )
  }

  if (kind === 'number') {
    const n = q.number || {}
    const hasRange = n.min != null && n.max != null
    const val = result ? picked : num
    return (
      <form
        className="qi qi-number"
        onSubmit={(e) => {
          e.preventDefault()
          if (num !== '' && !Number.isNaN(Number(num))) send(Number(num))
        }}
      >
        <div className="qi-num-row">
          <input type="number" inputMode="decimal" value={val} step={n.step || 1} min={n.min ?? undefined} max={n.max ?? undefined} onChange={(e) => setNum(e.target.value)} disabled={locked} autoFocus placeholder="?" aria-label="Your guess" />
          {n.unit && <span className="qi-unit">{n.unit}</span>}
        </div>
        {hasRange && (
          <input type="range" className="qi-range" min={n.min} max={n.max} step={n.step || 1} value={val === '' ? n.min : val} onChange={(e) => setNum(e.target.value)} disabled={locked} aria-label="Slide to guess" />
        )}
        {hasRange && (
          <div className="qi-range-lbl">
            <span>{n.min}</span>
            <span>{n.max}</span>
          </div>
        )}
        {!result && (
          <button type="submit" className="btn btn-primary qi-submit" disabled={locked || num === ''}>
            {pending ? <Loader2 size={16} className="spin" /> : <Send size={16} />} Lock in
          </button>
        )}
      </form>
    )
  }

  if (kind === 'order') {
    const list = result && Array.isArray(picked) ? picked : order
    const move = (from, to) => {
      if (locked || to < 0 || to >= order.length) return
      setOrder((o) => {
        const n = [...o]
        const [x] = n.splice(from, 1)
        n.splice(to, 0, x)
        return n
      })
    }
    return (
      <div className="qi">
        {!result && <p className="qi-hint">Drag or use the arrows, top to bottom</p>}
        <ol className="qi-order">
          {list.map((i, pos) => (
            <li
              key={i}
              className={`${drag === pos ? 'is-drag' : ''} ${result ? (result.correct ? 'is-right' : 'is-wrong') : ''}`}
              draggable={!locked}
              onDragStart={() => setDrag(pos)}
              onDragOver={(e) => {
                e.preventDefault()
                if (drag !== null && drag !== pos) {
                  move(drag, pos)
                  setDrag(pos)
                }
              }}
              onDragEnd={() => setDrag(null)}
            >
              <GripVertical size={16} className="qi-grip" />
              <span className="qi-pos">{pos + 1}</span>
              <span className="qi-txt">{optText[i]}</span>
              {!locked && (
                <span className="qi-arrows">
                  <button type="button" onClick={() => move(pos, pos - 1)} disabled={pos === 0} aria-label={`Move ${optText[i]} up`}>
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" onClick={() => move(pos, pos + 1)} disabled={pos === list.length - 1} aria-label={`Move ${optText[i]} down`}>
                    <ArrowDown size={15} />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ol>
        {!result && (
          <button type="button" className="btn btn-primary qi-submit" disabled={locked} onClick={() => send(order)}>
            {pending ? <Loader2 size={16} className="spin" /> : <Send size={16} />} Lock in order
          </button>
        )}
      </div>
    )
  }

  return null
}
