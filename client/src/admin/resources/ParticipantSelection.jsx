import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useListContext } from 'react-admin';
import { useSearchParams } from 'react-router';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { FILTER_KEYS } from './ParticipantFilters.jsx';

/**
 * Selection of participants for bulk actions. Either the ticked rows
 * (RA selectedIds, kept across pages) or — Gmail-style — "every participant
 * matching the filters", sent to the server as the filter itself and
 * resolved when the action runs.
 */
const SelectionContext = createContext(null);

export function SelectionProvider({ children }) {
  const [filterMode, setFilterMode] = useState(false);
  return <SelectionContext.Provider value={{ filterMode, setFilterMode }}>{children}</SelectionContext.Provider>;
}

export function useSelectionMode() {
  return useContext(SelectionContext) || { filterMode: false, setFilterMode: () => {} };
}

const pickFilters = (values) => Object.fromEntries(Object.entries(values || {}).filter(([k, v]) => FILTER_KEYS.includes(k) && v));

/** The current selection as sent to the API ({ mode: 'ids' | 'filtre' }), and its size. */
export function useCurrentSelection() {
  const { selectedIds, filterValues, total } = useListContext();
  const { filterMode } = useSelectionMode();
  if (filterMode) return { selection: { mode: 'filtre', filtre: pickFilters(filterValues) }, count: total ?? 0 };
  return { selection: { mode: 'ids', ids: selectedIds }, count: selectedIds.length };
}

/**
 * Keeps filters and page in the URL (?f=…&p=…, next to ?onglet=) and the
 * selection in the browser session, so they survive pagination and reloads.
 */
export function ListStateSync({ storageKey }) {
  const { filterValues, setFilters, page, setPage, selectedIds, onSelect } = useListContext();
  const { filterMode, setFilterMode } = useSelectionMode();
  const [params, setParams] = useSearchParams();
  const restored = useRef(false);

  // Restore once.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const f = params.get('f');
      if (f) setFilters(JSON.parse(f), {});
      const p = Number(params.get('p'));
      if (p > 1) setTimeout(() => setPage(p), 0);
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (saved?.ids?.length) onSelect(saved.ids);
      if (saved?.filterMode) setFilterMode(true);
    } catch {
      // ignore a malformed URL / storage
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Write back on change.
  useEffect(() => {
    if (!restored.current) return;
    const filters = pickFilters(filterValues);
    const next = new URLSearchParams(params);
    if (Object.keys(filters).length) next.set('f', JSON.stringify(filters));
    else next.delete('f');
    if (page > 1) next.set('p', String(page));
    else next.delete('p');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [filterValues, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!restored.current) return;
    sessionStorage.setItem(storageKey, JSON.stringify({ ids: selectedIds, filterMode }));
  }, [selectedIds, filterMode, storageKey]);

  return null;
}

/**
 * Counter + Gmail-style banner: once the whole page is ticked, offer to
 * select every participant matching the filters.
 */
export function SelectionBanner() {
  const { selectedIds, data = [], total = 0, onUnselectItems } = useListContext();
  const { filterMode, setFilterMode } = useSelectionMode();
  const previous = useRef(selectedIds);

  // Unticking / ticking rows leaves "all matching" mode.
  useEffect(() => {
    if (filterMode && previous.current !== selectedIds && selectedIds.length !== data.length) setFilterMode(false);
    previous.current = selectedIds;
  }, [selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!filterMode && selectedIds.length === 0) return null;

  const pageIds = data.map((r) => r.id);
  const wholePage = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const clear = () => {
    setFilterMode(false);
    onUnselectItems();
  };

  return (
    <Alert severity="info" icon={false} sx={{ mb: 1, py: 0.25, '& .MuiAlert-message': { width: '100%' } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {filterMode
            ? `Les ${total} participants correspondant aux filtres sont sélectionnés.`
            : `${selectedIds.length} sélectionné${selectedIds.length > 1 ? 's' : ''}`}
        </Typography>
        {!filterMode && wholePage && total > selectedIds.length && (
          <Button size="small" onClick={() => setFilterMode(true)}>
            Sélectionner les {total} participants correspondant aux filtres
          </Button>
        )}
        <Button size="small" color="inherit" onClick={clear}>
          Tout désélectionner
        </Button>
      </Stack>
    </Alert>
  );
}
