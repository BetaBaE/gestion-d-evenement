import { Admin, Resource, Layout, CustomRoutes } from 'react-admin';
import { Route } from 'react-router';
import polyglotI18nProvider from 'ra-i18n-polyglot';
import frenchMessages from 'ra-language-french';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import EventIcon from '@mui/icons-material/Event';
import MailIcon from '@mui/icons-material/Mail';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { dataProvider } from './dataProvider.js';
import { authProvider } from './authProvider.js';
import { AdminAppBar } from './AdminAppBar.jsx';
import { OrganisateurList, OrganisateurEdit, OrganisateurCreate } from './resources/organisateurs.jsx';
import { UserList, UserEdit, UserCreate } from './resources/users.jsx';
import { EventList, EventEdit, EventCreate } from './resources/events.jsx';
import { EventShow } from './resources/EventShow.jsx';
import { EmailSettingsPage } from './pages/EmailSettingsPage.jsx';
import { PartenairesPage } from './pages/PartenairesPage.jsx';
import { BadgeEditorPage } from './badgeEditor/BadgeEditorPage.jsx';

const i18nProvider = polyglotI18nProvider(() => frenchMessages, 'fr');

function AdminLayout(props) {
  return <Layout {...props} appBar={AdminAppBar} />;
}

export function AdminApp() {
  return (
    <Admin
      basename="/admin"
      dataProvider={dataProvider}
      authProvider={authProvider}
      i18nProvider={i18nProvider}
      layout={AdminLayout}
      requireAuth
    >
      {(permissions) => (
        <>
          {permissions === 'SUPER_ADMIN' && (
            <Resource
              name="organisateurs"
              list={OrganisateurList}
              edit={OrganisateurEdit}
              create={OrganisateurCreate}
              icon={BusinessIcon}
              options={{ label: 'Organisateurs' }}
            />
          )}
          {permissions === 'SUPER_ADMIN' && (
            <Resource
              name="users"
              list={UserList}
              edit={UserEdit}
              create={UserCreate}
              icon={PeopleIcon}
              options={{ label: 'Gestionnaires' }}
            />
          )}
          <Resource
            name="events"
            list={EventList}
            edit={EventEdit}
            create={EventCreate}
            show={EventShow}
            icon={EventIcon}
            options={{ label: 'Événements' }}
          />
          <Resource
            name="email-settings"
            list={EmailSettingsPage}
            icon={MailIcon}
            options={{ label: 'Paramètres email' }}
          />
          <Resource
            name="partenaires"
            list={PartenairesPage}
            icon={HandshakeIcon}
            options={{ label: 'Partenaires' }}
          />
          <CustomRoutes>
            <Route path="/badge-editor/:id" element={<BadgeEditorPage />} />
          </CustomRoutes>
        </>
      )}
    </Admin>
  );
}
