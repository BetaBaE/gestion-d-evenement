import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Center, Paper, PasswordInput, Stack, TextInput, Title, Alert } from '@mantine/core';
import { useAuth } from '../../context/AuthContext.jsx';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Center style={{ height: '100vh' }}>
      <Paper withBorder shadow="sm" p="xl" radius="md" style={{ width: 380 }}>
        <Title order={2} mb="md">
          Connexion
        </Title>
        <form onSubmit={handleSubmit}>
          <Stack>
            {error && <Alert color="red">{error}</Alert>}
            <TextInput
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Mot de passe"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
            />
            <Button type="submit" loading={isSubmitting} fullWidth>
              Se connecter
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
