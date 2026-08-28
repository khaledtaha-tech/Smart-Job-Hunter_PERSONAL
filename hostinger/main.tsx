import React from "react";
import { createRoot } from "react-dom/client";
import JobHunter from "../app/job-hunter";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <JobHunter />
  </React.StrictMode>,
);
