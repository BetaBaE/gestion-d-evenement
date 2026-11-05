import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Collapse, InputAdornment, List, ListItemButton, ListItemText, ListSubheader, Popover, TextField, Typography } from '@mui/material';
import DataObjectIcon from '@mui/icons-material/DataObject';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import LabelIcon from '@mui/icons-material/Label';
import EventIcon from '@mui/icons-material/Event';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BadgeIcon from '@mui/icons-material/Badge';
import SearchIcon from '@mui/icons-material/Search';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getVariable, listVariablesByGroup, resolveVariable, VARIABLE_GROUPS } from '../../../../shared/badge-renderer/index.js';

const GROUP_ICONS = {
  participant: PersonIcon,
  organisme: BusinessIcon,
  categorie: LabelIcon,
  event: EventIcon,
  organisateur: AccountBalanceIcon,
  badge: BadgeIcon,
};

const VAR_PATTERN = /\{\{\s*([a-zA-Z]+\.[a-zA-Z]+)\s*\}\}/g;
const groupLabel = (key) => VARIABLE_GROUPS.find((g) => g.key === key)?.libelle || key;

/** Label shown in a chip: "Organisme invité · Ville", or the raw key flagged unknown. */
function chipLabel(key) {
  const v = getVariable(key);
  return v ? `${groupLabel(v.groupe)} · ${v.libelle}` : `${key} (inconnue)`;
}

function chipNode(key) {
  const span = document.createElement('span');
  span.contentEditable = 'false';
  span.dataset.var = key;
  span.className = getVariable(key) ? 'var-chip' : 'var-chip var-chip--unknown';
  span.textContent = chipLabel(key);
  return span;
}

/** Text → DOM: literal text nodes (newlines kept, pre-wrap) and non-editable chips. */
function fillEditor(root, value) {
  root.replaceChildren();
  const text = String(value || '');
  let last = 0;
  for (const m of text.matchAll(VAR_PATTERN)) {
    if (m.index > last) root.append(document.createTextNode(text.slice(last, m.index)));
    root.append(chipNode(m[1]));
    last = m.index + m[0].length;
  }
  if (last < text.length) root.append(document.createTextNode(text.slice(last)));
}

/** DOM → text ({{key}} for chips). Tolerates <br>/<div> a browser may insert. */
function serialize(root) {
  let out = '';
  const walk = (node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) out += child.nodeValue.replace(/​/g, '');
      else if (child.dataset?.var) out += `{{${child.dataset.var}}}`;
      else if (child.nodeName === 'BR') out += '\n';
      else {
        if (child.nodeName === 'DIV' && out && !out.endsWith('\n')) out += '\n';
        walk(child);
      }
    });
  };
  walk(root);
  return out;
}

/**
 * Text field where variables are non-editable chips (deleted as one piece).
 * The DOM is only rebuilt when the value changes from outside (undo, other
 * element), so the browser's own undo keeps working while typing.
 */
export function VariableTextField({ label, value, onChange, previewCtx }) {
  const ref = useRef(null);
  const emitted = useRef(null);
  const savedRange = useRef(null);
  const [focused, setFocused] = useState(false);

  useLayoutEffect(() => {
    if (!ref.current || value === emitted.current) return;
    fillEditor(ref.current, value);
    emitted.current = value;
  }, [value]);

  // Remember the caret so "Insérer une variable" (which takes the focus) inserts there.
  useEffect(() => {
    const onSelection = () => {
      // Only while the field has the focus: when the focus moves to the menu's
      // search box, the browser reports a caret at offset 0 of the field.
      if (document.activeElement !== ref.current) return;
      const sel = document.getSelection();
      if (sel?.rangeCount && ref.current.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
    };
    document.addEventListener('selectionchange', onSelection);
    return () => document.removeEventListener('selectionchange', onSelection);
  }, []);

  const emit = () => {
    const next = serialize(ref.current);
    emitted.current = next;
    if (next !== value) onChange(next);
  };

  const insertVariable = (key) => {
    const root = ref.current;
    root.focus();
    const sel = document.getSelection();
    sel.removeAllRanges();
    if (savedRange.current && root.contains(savedRange.current.startContainer)) sel.addRange(savedRange.current);
    else {
      const end = document.createRange();
      end.selectNodeContents(root);
      end.collapse(false);
      sel.addRange(end);
    }
    // execCommand keeps the insertion in the field's native undo stack.
    const html = chipNode(key).outerHTML;
    if (!document.execCommand('insertHTML', false, html)) {
      root.append(chipNode(key));
    }
    emit();
  };

  return (
    <Box>
      <Typography variant="caption" color={focused ? 'primary' : 'text.secondary'} sx={{ display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Box
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            document.execCommand('insertText', false, '\n');
          }
        }}
        onPaste={(e) => {
          // Plain text only; typed {{…}} become chips.
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
          if (VAR_PATTERN.test(text)) {
            VAR_PATTERN.lastIndex = 0;
            const next = serialize(ref.current);
            fillEditor(ref.current, next);
            emitted.current = next;
            onChange(next);
          }
        }}
        sx={{
          minHeight: 72,
          p: 1,
          border: 1,
          borderColor: focused ? 'primary.main' : 'divider',
          borderRadius: 1,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontSize: 14,
          lineHeight: 1.9,
          outline: 'none',
          cursor: 'text',
          '& .var-chip': {
            display: 'inline-block',
            px: 0.75,
            mx: 0.25,
            borderRadius: 3,
            fontSize: 12,
            lineHeight: 1.6,
            bgcolor: 'action.selected',
            color: 'primary.main',
            fontWeight: 600,
            userSelect: 'all',
            whiteSpace: 'nowrap',
          },
          '& .var-chip--unknown': { bgcolor: 'error.main', color: 'error.contrastText' },
        }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
        Les variables sont remplacées par les données de chaque participant.
      </Typography>
      <VariableMenu previewCtx={previewCtx} onInsert={insertVariable} />
    </Box>
  );
}

/** "Insérer une variable": groups by entity, search, value for the preview participant. */
export function VariableMenu({ onInsert, previewCtx }) {
  const [anchor, setAnchor] = useState(null);
  const [search, setSearch] = useState('');
  const [closed, setClosed] = useState({});
  const groups = useMemo(() => listVariablesByGroup(), []);
  const q = search.trim().toLowerCase();
  const filtered = groups
    .map((g) => ({
      ...g,
      variables: q ? g.variables.filter((v) => `${v.libelle} ${v.key} ${g.libelle}`.toLowerCase().includes(q)) : g.variables,
    }))
    .filter((g) => g.variables.length > 0);

  return (
    <>
      <Button size="small" startIcon={<DataObjectIcon />} onMouseDown={(e) => e.preventDefault()} onClick={(e) => setAnchor(e.currentTarget)}>
        Insérer une variable
      </Button>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 480, display: 'flex', flexDirection: 'column' } } }}
      >
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            size="small"
            fullWidth
            autoFocus
            placeholder="Rechercher (ville, email, date…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          />
        </Box>
        <List dense disablePadding sx={{ overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              Aucune variable ne correspond.
            </Typography>
          )}
          {filtered.map((g) => {
            const Icon = GROUP_ICONS[g.key];
            const isOpen = q ? true : !closed[g.key];
            return (
              <li key={g.key}>
                <ListSubheader
                  onClick={() => setClosed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', lineHeight: '36px' }}
                >
                  <Icon fontSize="small" />
                  <Box sx={{ flex: 1 }}>{g.libelle}</Box>
                  {!q && (isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />)}
                </ListSubheader>
                <Collapse in={isOpen} unmountOnExit>
                  {g.variables.map((v) => {
                    const preview = previewCtx ? resolveVariable(v.key, previewCtx) : '';
                    return (
                      <ListItemButton
                        key={v.key}
                        data-variable={v.key}
                        onClick={() => {
                          onInsert(v.key);
                          setAnchor(null);
                          setSearch('');
                        }}
                        sx={{ pl: 4 }}
                      >
                        <ListItemText
                          title={`{{${v.key}}}`}
                          primary={
                            <>
                              {v.libelle}
                              <Box component="span" sx={{ color: 'text.secondary', fontStyle: preview ? 'normal' : 'italic' }}>
                                {' — '}
                                {preview || 'vide pour cet aperçu'}
                              </Box>
                            </>
                          }
                          slotProps={{ primary: { variant: 'body2', noWrap: true } }}
                        />
                      </ListItemButton>
                    );
                  })}
                </Collapse>
              </li>
            );
          })}
        </List>
      </Popover>
    </>
  );
}
