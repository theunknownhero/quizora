// Shows a readable error instead of a blank page if something crashes while rendering.
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('[QuizBit] render error:', error, info?.componentStack)
  }
  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#07060b', color: '#f4f2ff', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ maxWidth: 560, textAlign: 'center' }}>
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#a19db5', marginBottom: 14 }}>{this.props.label || 'This page'} crashed. Reloading usually fixes it. If not, send us this message:</p>
          <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: '#fca5a5', fontSize: 12.5 }}>{String(error?.message || error)}</pre>
          <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 14, padding: '10px 18px', borderRadius: 999, border: 0, background: '#8b5cf6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}
