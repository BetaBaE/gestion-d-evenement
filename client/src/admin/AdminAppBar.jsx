import { AppBar, TitlePortal } from 'react-admin';
import { Typography } from '@mui/material';
import { OrganisateurSwitcher } from './OrganisateurSwitcher.jsx';

export function AdminAppBar(props) {
  return (
    <AppBar {...props}>
      <TitlePortal />
      <Typography variant="body2" sx={{ marginLeft: 1 }}>
        Organisateur :
      </Typography>
      <OrganisateurSwitcher />
    </AppBar>
  );
}
