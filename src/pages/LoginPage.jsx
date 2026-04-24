import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import s from "../styles/LoginPage.module.css";

export default function LoginPage() {
  const { login, signup, loginWithGoogle, resetPassword } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(friendlyError(err.code));
    }
    setLoading(false);
  }

  return (
    <div className={s.wrapper}>
      <div className={s.card}>
        <h1 className={s.title}>Finance App</h1>
        <p className={s.subtitle}>
          {isSignup ? "Create an account" : "Sign in to continue"}
        </p>

        <form onSubmit={handleSubmit} className={s.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={s.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={s.input}
          />
          {error && <p className={s.error}>{error}</p>}
          {resetSent && <p className={s.success}>Password reset email sent.</p>}
          <button type="submit" disabled={loading} className={s.btn}>
            {loading ? "..." : isSignup ? "Sign Up" : "Sign In"}
          </button>
        </form>

        {!isSignup && (
          <button
            onClick={async () => {
              setError("");
              setResetSent(false);
              if (!email.trim()) {
                setError("Enter your email first.");
                return;
              }
              try {
                await resetPassword(email);
                setResetSent(true);
              } catch (err) {
                setError(friendlyError(err.code));
              }
            }}
            className={s.linkBtn}
            style={{ marginTop: "0.5rem" }}
          >
            Forgot password?
          </button>
        )}

        <div className={s.divider}>
          <span className={s.dividerLine} />
          <span className={s.dividerText}>or</span>
          <span className={s.dividerLine} />
        </div>

        <button
          onClick={async () => {
            setError("");
            try {
              await loginWithGoogle();
            } catch (err) {
              setError(friendlyError(err.code));
            }
          }}
          className={s.googleBtn}
        >
          Sign in with Google
        </button>

        <p className={s.toggle}>
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
            className={s.linkBtn}
          >
            {isSignup ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}

function friendlyError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "Email already in use.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    default:
      return "Something went wrong. Try again.";
  }
}
