import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Uncaught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          maxWidth: 480,
          margin: "4rem auto",
          padding: "2rem",
          textAlign: "center",
          color: "rgba(255,255,255,0.87)",
        }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Something went wrong</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Your data is safe in the cloud.
          </p>
          <button onClick={() => window.location.reload()}>
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
