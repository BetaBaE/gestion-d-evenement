import { AppBar, TitlePortal } from 'react-admin';
import { Typography, Box } from '@mui/material';
import { OrganisateurSwitcher } from './OrganisateurSwitcher.jsx';
import { TasksButton } from './jobs/TasksPanel.jsx';

export function AdminAppBar(props) {
  return (
    <AppBar {...props}>
      <TitlePortal />
      <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Typography variant="body2" noWrap sx={{ marginLeft: 1 }}>
          Organisateur :
        </Typography>
        <OrganisateurSwitcher />
        <TasksButton />
      </Box>
    </AppBar>
  );
}
