// client/src/ErrorBoundary.tsx
import React from "react"

type Props = { children: React.ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App crashed:", error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontFamily: "system-ui" }}>
          <h1>Something broke.</h1>
          <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#0f0", padding: 12, borderRadius: 8 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <p>Open DevTools → Console for the stack trace.</p>
        </div>
      )
    }
    return this.props.children
  }
}
