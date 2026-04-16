import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import Auth from "./auth";
import Dashboard from "./Dashboard";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await axios.get(`${API_URL}/user/profile`, {
          withCredentials: true,
        });
        setCurrentUser(response.data?.data || null);
      } catch (error) {
        setCurrentUser(null);
      } finally {
        setCheckingSession(false);
      }
    };

    restoreSession();
  }, []);

  if (checkingSession) {
    return (
      <div className="app-shell">
        <div className="app-loader-card">
          <span className="app-loader-ring" />
          <p>Workspace load ho raha hai...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {currentUser ? (
        <Dashboard
          apiUrl={API_URL}
          currentUser={currentUser}
          onLogout={() => setCurrentUser(null)}
          onProfileUpdate={setCurrentUser}
        />
      ) : (
        <Auth apiUrl={API_URL} onAuthSuccess={setCurrentUser} />
      )}
    </div>
  );
}

export default App;
