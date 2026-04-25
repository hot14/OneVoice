import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import HomePage from './pages/Home';
import GuidePage from './pages/Guide';
import TranslatePage from './pages/Translate';
import HistoryPage from './pages/History';
import HistoryDetailPage from './pages/HistoryDetail';
import SettingsPage from './pages/Settings';
import SubscriptionPage from './pages/Subscription';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Main App Layout containing Top/Bottom Navigation */}
        <Route element={<Layout />}>
          <Route path="/" element={<TranslatePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<HistoryDetailPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
