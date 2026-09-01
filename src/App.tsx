import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { GroundwaterMapPage } from './pages/GroundwaterMapPage';
import { ForecastPage } from './pages/ForecastPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { CropAdvisorPage } from './pages/CropAdvisorPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { WhatsAppPage } from './pages/WhatsAppPage';
import { HelpPage } from './pages/HelpPage';
import { DemoPage } from './pages/DemoPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<GroundwaterMapPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/anomalies" element={<AnomaliesPage />} />
          <Route path="/crops" element={<CropAdvisorPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/whatsapp" element={<WhatsAppPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/demo" element={<DemoPage />} />
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
