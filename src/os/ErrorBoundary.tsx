import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

/** Last line of defence: a throw anywhere below would otherwise leave a blank
 * page with no way back. Portfolio data comes from a remote gist, so a schema
 * drift is a realistic trigger. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Unhandled render error", error, info.componentStack);
  }

  render() {
    if (this.state.message === null) return this.props.children;
    return (
      <div className="boot-screen" role="alert">
        <div className="boot-error">
          <div className="boot-error-title">Something went wrong</div>
          <div className="boot-error-msg">{this.state.message}</div>
          <button
            className="boot-retry"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
