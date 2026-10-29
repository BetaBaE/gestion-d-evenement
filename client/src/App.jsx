import { Routes, Route } from 'react-router';
import { Title, Center } from '@mantine/core';
import { AdminApp } from './admin/AdminApp.jsx';

function HomePlaceholder() {
  return (
    <Center style={{ height: '100vh' }}>
      <Title order={2}>Gestion des inscriptions</Title>
    </Center>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePlaceholder />} />
      <Route path="/admin/*" element={<AdminApp />} />
    </Routes>
  );
}
