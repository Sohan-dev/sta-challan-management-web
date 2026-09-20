import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase/config"; // Ensure the path to your firebase.js file is correct
import "../styles/LoginPage.css";
import { analytics } from "../firebase/config";
import { logEvent } from "firebase/analytics";

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Form Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (username.trim() === "" || password.trim() === "") {
      setError("Please enter both username and password");
      return;
    }

    setError("");
    onLogin(username);
  };

  // Firebase Google Login Handler
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Log custom login event to Firebase Analytics
      if (analytics) {
        logEvent(analytics, "login", { method: "Google" });
      }

      // Pass user's display name or email to the onLogin callback
      const loggedInUsername = user.displayName || user.email;
      onLogin(loggedInUsername);
    } catch (err) {
      console.error("Google login error:", err);
      setError(
        err.message || "Failed to sign in with Google. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-logo">
            <span className="logo-dot orange"></span>
            <span className="logo-dot blue"></span>
          </div>
          <h1 className="brand-title">STA Management</h1>
        </div>

        {/* Social Login Buttons */}
        <div className="social-buttons">
          <button
            type="button"
            className="social-btn"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
            <svg
              className="social-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="divider">
          <span>OR</span>
        </div>

        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            placeholder="Username or Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className="submit-btn" disabled={true}>
            Sign In
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default LoginPage;
