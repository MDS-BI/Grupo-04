import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles.css'), 'utf8');

let dom;

function qs(id) {
  return document.getElementById(id);
}

function labelTextFor(element) {
  const id = element.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent.trim();
  }
  return element.getAttribute('aria-label') || '';
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16));
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function cssToken(name) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,6})`));
  return match ? match[1] : null;
}

beforeEach(async () => {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  w.scrollTo = vi.fn();
  w.localStorage.clear();
  vi.resetModules();
  const { boot } = await import('../../src/app.js');
  await boot();
});

afterEach(() => {
  dom.window.close();
});

describe('T062 — accesibilidad (jsdom; validación manual en navegadores pendiente)', () => {
  it('associates a label with every visible form control', () => {
    qs('nav-entities').click();
    const controls = [
      ...document.querySelectorAll('#entity-form input, #entity-form select, #entity-form textarea')
    ].filter((element) => element.type !== 'hidden');
    expect(controls.length).toBeGreaterThan(5);
    for (const control of controls) {
      expect(labelTextFor(control)).not.toBe('');
    }

    qs('nav-documents').click();
    const docControls = [
      ...document.querySelectorAll('#document-form input, #document-form select, #document-form textarea')
    ].filter((element) => element.type !== 'hidden');
    for (const control of docControls) {
      expect(labelTextFor(control)).not.toBe('');
    }
  });

  it('links every validation error with aria-describedby and announces it politely', () => {
    qs('nav-entities').click();
    qs('name').value = '';
    qs('code').value = '';
    qs('category').value = '';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    for (const id of ['name', 'code', 'category']) {
      expect(qs(id).getAttribute('aria-describedby')).toContain(`error-${id}`);
      expect(qs(id).getAttribute('aria-invalid')).toBe('true');
      expect(qs(`error-${id}`).getAttribute('aria-live')).toBe('polite');
      expect(qs(`error-${id}`).textContent.length).toBeGreaterThan(0);
    }

    qs('nav-documents').click();
    qs('folio').value = '';
    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(qs('folio').getAttribute('aria-describedby')).toContain('error-folio');
    expect(qs('totalAmount').getAttribute('aria-describedby')).toContain('error-totalAmount');
    expect(qs('status').getAttribute('aria-describedby')).toContain('error-status');
  });

  it('keeps a logical tab order starting with the client identification', () => {
    qs('nav-entities').click();
    const order = ['name', 'code', 'category', 'email', 'phone', 'targetDate', 'submit-button'];
    const positions = order.map((id) =>
      [...document.querySelectorAll('#entity-form input, #entity-form select, #entity-form button')].indexOf(qs(id))
    );
    expect(positions.every((value) => value >= 0)).toBe(true);
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it('defines a visible focus style and sufficient contrast tokens', () => {
    expect(css).toMatch(/:focus-visible/);
    expect(css).toMatch(/--focus-ring/);

    const text = cssToken('text');
    const background = cssToken('bg');
    const accent = cssToken('accent');
    const sidebarText = cssToken('sidebar-text');
    const sidebarBackground = cssToken('sidebar-bg');
    expect(text && background && accent && sidebarText && sidebarBackground).toBeTruthy();
    expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(text, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(accent, '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(sidebarText, sidebarBackground)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps sidebar names accessible on a narrow screen', () => {
    expect(css).toMatch(/@media \(max-width: 900px\)/);
    expect(css).toMatch(/\.nav-module \.nav-label\s*\{\s*display:\s*none/);
    document.querySelectorAll('.nav-module').forEach((button) => {
      expect(button.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
