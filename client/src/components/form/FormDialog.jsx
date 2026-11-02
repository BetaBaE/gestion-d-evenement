import { createContext, useContext, useEffect, useRef } from 'react';
import { Form } from 'react-admin';
import { useFormState } from 'react-hook-form';
import { Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import { FormPage } from './FormLayout.jsx';
import { FormActions } from './raInputs.jsx';

const DialogFormContext = createContext(null);

/**
 * Dialog frame for record forms opened from a list (catégories, organismes,
 * participants, partenaires). Closing with Échap / a click outside asks for
 * confirmation while the form inside has unsaved changes.
 */
export function FormDialog({ open, onClose, title, subtitle, maxWidth = 'md', children }) {
  const dirtyRef = useRef(false);

  function requestClose() {
    if (dirtyRef.current && !window.confirm('Des modifications ne sont pas enregistrées. Fermer quand même ?')) return;
    dirtyRef.current = false;
    onClose();
  }

  function forceClose() {
    dirtyRef.current = false;
    onClose();
  }

  return (
    <Dialog open={open} onClose={requestClose} maxWidth={maxWidth} fullWidth scroll="paper">
      <DialogTitle sx={{ pb: subtitle ? 0.5 : 2 }}>
        {title}
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers sx={{ pb: 0 }}>
        <DialogFormContext.Provider value={{ dirtyRef, forceClose }}>{children}</DialogFormContext.Provider>
      </DialogContent>
    </Dialog>
  );
}

function DirtyTracker() {
  const ctx = useContext(DialogFormContext);
  const { isDirty } = useFormState();
  useEffect(() => {
    if (ctx) ctx.dirtyRef.current = isDirty;
  }, [ctx, isDirty]);
  return null;
}

/** react-admin Form laid out with FormSections and a sticky Annuler / Enregistrer bar. */
export function DialogForm({ children, saveLabel, defaultValues, extraActions, onSubmit, record }) {
  const ctx = useContext(DialogFormContext);
  return (
    <Form mode="onBlur" reValidateMode="onChange" defaultValues={defaultValues} onSubmit={onSubmit} record={record}>
      <DirtyTracker />
      <FormPage embedded actions={<FormActions onCancel={ctx?.forceClose} saveLabel={saveLabel} extra={extraActions} />}>
        {children}
      </FormPage>
    </Form>
  );
}
