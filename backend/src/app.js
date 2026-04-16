import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import ApiError from './utils/ApiError.js';

const a = express();

a.use(
  cors({
    origin: (origin, callback) => {
      const allowed = process.env.CORS_ORIGIN;

      // If there is no origin (non-browser requests), allow it.
      if (!origin) return callback(null, true);

      // If allowed is '*' then reflect the requesting origin (important for `credentials: true`).
      if (!allowed || allowed === "*" || origin === allowed) return callback(null, true);

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

a.use(express.json({ limit: '16kb' }));
a.use(express.urlencoded({ extended: true, limit: '16kb' }));
a.use(cookieParser());
import route from './routes/user.routes.js';
import taskRoute from './routes/task.routes.js';
import workspaceRoute from './routes/workspace.routes.js';

a.use("/user", route);
a.use("/task", taskRoute);
a.use("/workspace", workspaceRoute);

// Global error handler
a.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }
  return res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export default a;