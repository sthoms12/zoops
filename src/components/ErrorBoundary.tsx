import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Fire-and-forget — never block the fallback render
    fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "react_error",
        message: error.message,
        stack: error.stack + "\n\nComponent stack:" + info.componentStack,
      }),
    }).catch(() => {});
  }

  retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
        <AlertTriangle size={28} className="text-yellow-400 mb-3" />
        <p className="text-sm font-medium mb-1">
          {this.props.label ? `${this.props.label} crashed` : "Something went wrong"}
        </p>
        <p className="text-xs text-muted-foreground mb-4 max-w-sm font-mono break-all">
          {this.state.error.message}
        </p>
        <button
          onClick={this.retry}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary text-muted-foreground transition-colors"
        >
          <RefreshCw size={12} /> Try again
        </button>
      </div>
    );
  }
}
