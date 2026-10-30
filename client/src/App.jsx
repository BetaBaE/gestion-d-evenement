import { Routes, Route } from 'react-router';
import { AdminApp } from './admin/AdminApp.jsx';
import { InscriptionPage } from './pages/public/InscriptionPage.jsx';
import { ScanPage } from './pages/public/ScanPage.jsx';
import { PublicLayout } from './layouts/PublicLayout.jsx';
import { HomePage } from './pages/public/HomePage.jsx';

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicLayout>
            <HomePage />
          </PublicLayout>
        }
      />
      <Route
        path="/inscription/:formToken"
        element={
          <PublicLayout>
            <InscriptionPage />
          </PublicLayout>
        }
      />
      <Route
        path="/scan/:scanToken"
        element={
          <PublicLayout>
            <ScanPage />
          </PublicLayout>
        }
      />
      <Route path="/admin/*" element={<AdminApp />} />
    </Routes>
  );
}
