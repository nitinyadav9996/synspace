import { useState } from "react";
import axios from "axios";
import "./auth.css";

export default function Auth({ apiUrl, onAuthSuccess }) {
  const [mode, setMode] = useState("login");
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

        setMode("login");
        setName("");
        setPassword("");
        setSuccessMessage("Account create ho gaya. Ab login karke dashboard kholo.");
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
      </div>
    </div>
  );
}
