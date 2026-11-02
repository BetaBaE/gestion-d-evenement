import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderEditorSheet, renderBadgeHtml, STARTER_TEMPLATES } from './index.js';

const sample = {
  participant: { nom: 'Dupont', prenom: 'Jean', fonction: 'Directeur', badgeCode: 'X' },
  event: { titre: 'Salon', dateDebut: '2026-09-14', dateFin: '2026-09-15' },
  organisme: { nom: 'ATNER' },
  organisateur: {},
  categorie: { _id: 'c1', nom: 'Invité', couleur: '#1971c2' },
  assets: {},
};

test('editor CSS is fully scoped (no global reset or body rule leaks)', () => {
  const badge = STARTER_TEMPLATES.SALON_A4_PLIE_4.build();
  const { css } = renderEditorSheet({ badge, theme: badge.theme, ...sample, scope: '.badge-editor' });
  const selectors = [...css.matchAll(/(?:^|})\s*([^{}]+)\{/g)].flatMap((m) => m[1].split(',').map((s) => s.trim()));
  assert.ok(selectors.length > 10);
  for (const sel of selectors) {
    assert.ok(sel.startsWith('.badge-editor'), `unscoped selector: ${sel}`);
  }
  assert.ok(!css.includes('@page'));
});

test('editor shows placeholders for empty elements; print output omits them', () => {
  const badge = {
    format: 'A6',
    theme: {},
    elements: [{ id: 'p1', type: 'photo', panneau: 'P1', x: 5, y: 5, largeur: 20, hauteur: 20, props: {}, style: {} }],
  };
  const { html } = renderEditorSheet({ badge, theme: {}, ...sample, scope: '.s' });
  assert.ok(html.includes('data-element-id="p1"'));
  assert.ok(html.includes('el-placeholder'));
  assert.ok(!renderBadgeHtml({ badge, theme: {}, ...sample }).includes('data-element-id="p1"'));
});

test('elements hidden for the participant category are ghosted in editor, dropped in print', () => {
  const badge = {
    format: 'A6',
    theme: {},
    elements: [
      { id: 'v1', type: 'texte', panneau: 'P1', x: 5, y: 5, largeur: 40, hauteur: 8, props: { contenu: 'VIP' }, style: {}, visibleSi: { categories: ['other'] } },
    ],
  };
  const { html } = renderEditorSheet({ badge, theme: {}, ...sample, scope: '.s' });
  assert.match(html, /class="[^"]*el-ghost[^"]*" data-element-id="v1"/);
  assert.ok(!renderBadgeHtml({ badge, theme: {}, ...sample }).includes('data-element-id="v1"'));
});

test('style values cannot break out of the style attribute', () => {
  const badge = {
    format: 'A6',
    theme: {},
    elements: [
      {
        id: 'x"><script>alert(1)</script>',
        type: 'texte',
        panneau: 'P1',
        x: 5,
        y: 5,
        largeur: 40,
        hauteur: 8,
        props: { contenu: 'Bonjour' },
        style: { police: 'Arial"><img src=x onerror=alert(1)>' },
      },
    ],
  };
  const html = renderBadgeHtml({ badge, theme: {}, ...sample });
  assert.ok(!html.includes('<script>alert'));
  assert.ok(!html.includes('<img src=x'));
});
