import { useState } from "react";
import axios from "axios";
import "./auth.css";

export default function Auth({ apiUrl, onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      if (mode === "register") {
        await axios.post(
          `${apiUrl}/user/register`,
          { name, email, password },
          { withCredentials: true }
        );

        setVerificationEmail(email.trim().toLowerCase());
        setOtp("");
        setName("");
        setPassword("");
        setSuccessMessage("OTP email pe bhej diya gaya hai. Verify karke login karo.");
        return;
      }

      const response = await axios.post(
        `${apiUrl}/user/login`,
        { email, password },
        { withCredentials: true }
      );

      onAuthSuccess(response.data?.data?.user || null);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      await axios.post(
        `${apiUrl}/user/verify-email`,
        { email: verificationEmail, otp },
        { withCredentials: true }
      );

      setMode("login");
      setOtp("");
      setVerificationEmail("");
      setSuccessMessage("Email verify ho gayi. Ab login karo.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "OTP verify nahi ho paya");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      await axios.post(
        `${apiUrl}/user/resend-verification-otp`,
        { email: verificationEmail },
        { withCredentials: true }
      );
      setSuccessMessage("Naya OTP bhej diya gaya hai.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "OTP resend nahi ho paya");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-copy-panel">
        <p className="auth-kicker">SyncSpace Nexus</p>
        <h1>Sign in karo aur apna workspace manage karo.</h1>
        <p>Team workspace banao, tasks track karo, status update karo aur profile manage karo.</p>
        <div className="auth-feature-strip">
          <span>Protected dashboard</span>
          <span>Workspace management</span>
          <span>Task tracking</span>
        </div>
      </section>

      <div className="form-container">
        <div className="form-toggle">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <h2>{mode === "login" ? "Login" : "Create account"}</h2>

          {mode === "register" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="Name"
              required
            />
          )}

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            required
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </button>

          {error && <p className="form-message error-message">{error}</p>}
          {successMessage && <p className="form-message success-message">{successMessage}</p>}

          <p className="switch-copy">
            {mode === "login" ? "New user? Register" : "Already have an account? Login"}
          </p>
        </form>

        {verificationEmail && (
          <form className="form" onSubmit={handleVerifyOtp}>
            <h2>Verify Email</h2>
            <input type="email" value={verificationEmail} readOnly />
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              type="text"
              placeholder="Enter 6-digit OTP"
              minLength={6}
              maxLength={6}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Please wait..." : "Verify OTP"}
            </button>

            <button type="button" disabled={loading} onClick={handleResendOtp}>
              Resend OTP
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
