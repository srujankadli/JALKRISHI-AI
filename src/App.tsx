import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { GroundwaterMapPage } from './pages/GroundwaterMapPage';
import { ForecastPage } from './pages/ForecastPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { CropAdvisorPage } from './pages/CropAdvisorPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { WhatsAppPage } from './pages/WhatsAppPage';
import { HelpPage } from './pages/HelpPage';

import { LanguageProvider } from './context/LanguageContext';
import { FarmProvider } from './context/FarmContext';

import { OfficialCommandCenter } from './pages/official/OfficialCommandCenter';
import { ProtectedOfficialRoute } from './components/auth/ProtectedOfficialRoute';

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <FarmProvider>
          <BrowserRouter>
          <Routes>
            {/* Standalone Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Main Platform Shell Routes */}
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route
                path="/official"
                element={
                  <ProtectedOfficialRoute>
                    <OfficialCommandCenter />
                  </ProtectedOfficialRoute>
                }
              />
              <Route path="/map" element={<GroundwaterMapPage />} />
              <Route path="/forecast" element={<ForecastPage />} />
              <Route path="/anomalies" element={<AnomaliesPage />} />
              <Route path="/crops" element={<CropAdvisorPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/whatsapp" element={<WhatsAppPage />} />
              <Route path="/help" element={<HelpPage />} />
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </FarmProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
