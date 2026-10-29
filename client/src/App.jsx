import { Routes, Route } from 'react-router';
import { Title, Text, Stack, Center } from '@mantine/core';
import { LoginPage } from './pages/public/LoginPage.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';

function AdminHomePlaceholder() {
  const { user, logout } = useAuth();
  return (
    <Center style={{ height: '100vh' }}>
      <Stack align="center">
        <Title order={2}>Bienvenue, {user.prenom} {user.nom}</Title>
        <Text c="dimmed">Rôle : {user.role}</Text>
        <Text component="button" onClick={logout} style={{ cursor: 'pointer', border: 'none', background: 'none', color: 'blue' }}>
          Se déconnecter
        </Text>
      </Stack>
    </Center>
  );
}

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
      <Route path="/connexion" element={<LoginPage />} />
      <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'GESTIONNAIRE']} />}>
        <Route path="/admin" element={<AdminHomePlaceholder />} />
      </Route>
    </Routes>
  );
}
