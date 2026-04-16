import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./dashboard.css";

const emptyWorkspaceForm = {
  name: "",
  description: "",
};

const emptyTaskForm = {
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
};

const statusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export default function Dashboard({
  apiUrl,
  currentUser,
  onLogout,
  onProfileUpdate,
}) {
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || "",
    profilePicture: currentUser?.profilePicture || "",
  });
  const [workspaceForm, setWorkspaceForm] = useState(emptyWorkspaceForm);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [dashboardState, setDashboardState] = useState({
    loading: true,
    taskLoading: false,
    error: "",
    success: "",
  });

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace._id === selectedWorkspaceId) || null,
    [workspaces, selectedWorkspaceId]
  );

  const taskStats = useMemo(() => {
    return tasks.reduce(
      (stats, task) => {
        stats.total += 1;
        stats[task.status] += 1;
        return stats;
      },
      { total: 0, todo: 0, in_progress: 0, done: 0 }
    );
  }, [tasks]);

  const setMessage = (next) => {
    setDashboardState((previous) => ({
      ...previous,
      error: next.error ?? "",
      success: next.success ?? "",
    }));
  };

  const fetchWorkspaces = async (preferredWorkspaceId) => {
    setDashboardState((previous) => ({
      ...previous,
      loading: true,
      error: "",
    }));

    try {
      const response = await axios.get(`${apiUrl}/workspace`, {
        withCredentials: true,
      });
      const workspaceList = response.data?.data || [];
      setWorkspaces(workspaceList);

      const nextWorkspaceId =
        preferredWorkspaceId && workspaceList.some((item) => item._id === preferredWorkspaceId)
          ? preferredWorkspaceId
          : workspaceList[0]?._id || "";

      setSelectedWorkspaceId(nextWorkspaceId);
    } catch (error) {
      setMessage({
        error: error?.response?.data?.message || "Workspace fetch nahi ho paaya.",
      });
    } finally {
      setDashboardState((previous) => ({
        ...previous,
        loading: false,
      }));
    }
  };

  const fetchTasks = async (workspaceId) => {
    if (!workspaceId) {
      setTasks([]);
      return;
    }

    setDashboardState((previous) => ({
      ...previous,
      taskLoading: true,
      error: "",
    }));

    try {
      const response = await axios.get(`${apiUrl}/task/workspace/${workspaceId}`, {
        withCredentials: true,
      });
      setTasks(response.data?.data || []);
    } catch (error) {
      setMessage({
        error: error?.response?.data?.message || "Tasks fetch nahi ho paaye.",
      });
    } finally {
      setDashboardState((previous) => ({
        ...previous,
        taskLoading: false,
      }));
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    setProfileForm({
      name: currentUser?.name || "",
      profilePicture: currentUser?.profilePicture || "",
    });
  }, [currentUser]);

  useEffect(() => {
    fetchTasks(selectedWorkspaceId);
  }, [selectedWorkspaceId]);

  const handleWorkspaceSubmit = async (event) => {
    event.preventDefault();
    setMessage({});

    try {
      const response = await axios.post(`${apiUrl}/workspace`, workspaceForm, {
        withCredentials: true,
      });

      const createdWorkspace = response.data?.data;
      setWorkspaceForm(emptyWorkspaceForm);
      setMessage({ success: "Naya workspace create ho gaya." });
      await fetchWorkspaces(createdWorkspace?._id);
    } catch (error) {
      setMessage({
        error: error?.response?.data?.message || "Workspace create nahi ho paaya.",
      });
    }
  };

  const handleTaskSubmit = async (event) => {
    event.preventDefault();
    if (!selectedWorkspaceId) {
      setMessage({ error: "Task banane se pehle workspace select karo." });
      return;
    }

    setMessage({});

    try {
      await axios.post(
        `${apiUrl}/task`,
        {
          ...taskForm,
          workspaceId: selectedWorkspaceId,
          dueDate: taskForm.dueDate || null,
        },
        { withCredentials: true }
      );

      setTaskForm(emptyTaskForm);
      setMessage({ success: "Task create ho gaya." });
      await fetchTasks(selectedWorkspaceId);
    } catch (error) {
      setMessage({
        error: error?.response?.data?.message || "Task create nahi ho paaya.",
      });
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await axios.put(
        `${apiUrl}/task/${taskId}`,
        { status },
        { withCredentials: true }
      );
      await fetchTasks(selectedWorkspaceId);
    } catch (error) {
      setMessage({
        error: error?.response?.data?.message || "Task update nahi ho paaya.",
      });
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`${apiUrl}/task/${taskId}`, {
        withCredentials: true,
      });
      setMessage({ success: "Task delete ho gaya." });
      await fetchTasks(selectedWorkspaceId);
    } catch (error) {
      setMessage({
        error: error?.response?.data?.message || "Task delete nahi ho paaya.",
      });
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setMessage({});

    try {
      const response = await axios.put(`${apiUrl}/user/profile`, profileForm, {
        withCredentials: true,
      });
      onProfileUpdate(response.data?.data || currentUser);
      setMessage({ success: "Profile update ho gaya." });
    } catch (error) {
      setMessage({
        error: error?.response?.data?.message || "Profile update nahi ho paaya.",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        `${apiUrl}/user/logout`,
        {},
        {
          withCredentials: true,
        }
      );
    } catch (error) {
      // Even if backend logout fails, clear local session so user is not stuck.
    } finally {
      onLogout();
    }
  };

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand-block">
          <p className="eyebrow">SyncSpace Nexus</p>
          <h1>Dashboard</h1>
          <p className="muted-copy">
            Team workspace, tasks aur profile ek hi jagah manage karo.
          </p>
        </div>

        <div className="profile-card">
          <div className="avatar-circle">
            {currentUser?.name?.slice(0, 1)?.toUpperCase() || "U"}
          </div>
          <div>
            <h2>{currentUser?.name}</h2>
            <p>{currentUser?.email}</p>
          </div>
        </div>

        <form className="panel form-panel" onSubmit={handleProfileSubmit}>
          <div className="panel-header">
            <h3>Profile</h3>
            <span>Edit</span>
          </div>

          <label>
            Name
            <input
              type="text"
              value={profileForm.name}
              onChange={(event) =>
                setProfileForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            Profile picture URL
            <input
              type="url"
              value={profileForm.profilePicture}
              onChange={(event) =>
                setProfileForm((previous) => ({
                  ...previous,
                  profilePicture: event.target.value,
                }))
              }
              placeholder="https://example.com/avatar.jpg"
            />
          </label>

          <button type="submit">Save Profile</button>
        </form>

        <button type="button" className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-main">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>{currentUser?.name}, aaj ka focus clear rakhte hain.</h2>
          </div>

          <div className="stats-grid">
            <article className="stat-card">
              <span>Workspaces</span>
              <strong>{workspaces.length}</strong>
            </article>
            <article className="stat-card">
              <span>Total Tasks</span>
              <strong>{taskStats.total}</strong>
            </article>
            <article className="stat-card">
              <span>In Progress</span>
              <strong>{taskStats.in_progress}</strong>
            </article>
            <article className="stat-card">
              <span>Done</span>
              <strong>{taskStats.done}</strong>
            </article>
          </div>
        </section>

        {(dashboardState.error || dashboardState.success) && (
          <section
            className={`feedback-banner ${
              dashboardState.error ? "feedback-error" : "feedback-success"
            }`}
          >
            {dashboardState.error || dashboardState.success}
          </section>
        )}

        <section className="dashboard-grid">
          <div className="panel">
            <div className="panel-header">
              <h3>Create Workspace</h3>
              <span>New space</span>
            </div>

            <form className="form-panel" onSubmit={handleWorkspaceSubmit}>
              <label>
                Workspace name
                <input
                  type="text"
                  value={workspaceForm.name}
                  onChange={(event) =>
                    setWorkspaceForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Product Sprint"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  value={workspaceForm.description}
                  onChange={(event) =>
                    setWorkspaceForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  rows="3"
                  placeholder="Workspace kis kaam ke liye hai?"
                />
              </label>

              <button type="submit">Create Workspace</button>
            </form>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Your Workspaces</h3>
              <span>{dashboardState.loading ? "Loading..." : `${workspaces.length} total`}</span>
            </div>

            <div className="workspace-list">
              {workspaces.length === 0 && (
                <p className="empty-state">
                  Abhi tak koi workspace nahi hai. Pehla workspace create karo.
                </p>
              )}

              {workspaces.map((workspace) => (
                <button
                  key={workspace._id}
                  type="button"
                  className={`workspace-card ${
                    workspace._id === selectedWorkspaceId ? "workspace-card-active" : ""
                  }`}
                  onClick={() => setSelectedWorkspaceId(workspace._id)}
                >
                  <div>
                    <h4>{workspace.name}</h4>
                    <p>{workspace.description || "No description added yet."}</p>
                  </div>
                  <span>{workspace.members?.length || 0} members</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Create Task</h3>
              <span>{selectedWorkspace?.name || "Select workspace"}</span>
            </div>

            <form className="form-panel" onSubmit={handleTaskSubmit}>
              <label>
                Title
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(event) =>
                    setTaskForm((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Design dashboard cards"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  value={taskForm.description}
                  onChange={(event) =>
                    setTaskForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  rows="3"
                  placeholder="Task details likho"
                />
              </label>

              <div className="inline-fields">
                <label>
                  Priority
                  <select
                    value={taskForm.priority}
                    onChange={(event) =>
                      setTaskForm((previous) => ({
                        ...previous,
                        priority: event.target.value,
                      }))
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <label>
                  Due date
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(event) =>
                      setTaskForm((previous) => ({
                        ...previous,
                        dueDate: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <button type="submit">Add Task</button>
            </form>
          </div>

          <div className="panel panel-wide">
            <div className="panel-header">
              <h3>Task Board</h3>
              <span>{selectedWorkspace?.name || "No workspace selected"}</span>
            </div>

            {dashboardState.taskLoading ? (
              <p className="empty-state">Tasks load ho rahe hain...</p>
            ) : tasks.length === 0 ? (
              <p className="empty-state">
                {selectedWorkspace
                  ? "Is workspace me abhi tasks nahi hain."
                  : "Tasks dekhne ke liye workspace select karo."}
              </p>
            ) : (
              <div className="task-list">
                {tasks.map((task) => (
                  <article key={task._id} className="task-card">
                    <div className="task-card-top">
                      <div>
                        <h4>{task.title}</h4>
                        <p>{task.description || "No description available."}</p>
                      </div>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleDeleteTask(task._id)}
                      >
                        Delete
                      </button>
                    </div>

                    <div className="task-meta">
                      <span className={`pill pill-${task.priority}`}>
                        {priorityLabels[task.priority]}
                      </span>
                      <span className="pill pill-neutral">
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("en-IN")
                          : "No deadline"}
                      </span>
                      <span className="pill pill-neutral">
                        {task.assignedTo?.name || "Unassigned"}
                      </span>
                    </div>

                    <label className="status-field">
                      Status
                      <select
                        value={task.status}
                        onChange={(event) => handleStatusChange(task._id, event.target.value)}
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
