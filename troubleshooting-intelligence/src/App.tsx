import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import IntelligenceDashboardPage from "./pages/intelligence-dashboard";
import WeeklyArchivePage from "./pages/weekly-archive";
import WeeklyPostPage from "./pages/weekly-post";

export default function App() {
  useEffect(() => {
    // Force dark theme — this design is dark-only, no OS override
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IntelligenceDashboardPage />} />
        <Route path="/weekly/archive" element={<WeeklyArchivePage />} />
        <Route path="/weekly" element={<WeeklyPostPage />} />
        <Route path="/weekly/:dateSlug/:slug" element={<WeeklyPostPage />} />
        <Route path="/weekly/:slug" element={<WeeklyPostPage />} />
      </Routes>
    </BrowserRouter>
  );
}
