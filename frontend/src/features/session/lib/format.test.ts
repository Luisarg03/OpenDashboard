import { describe, expect, it } from 'vitest';

import { formatModel } from './format';

describe('formatModel', () => {
  it('passes plain strings through unchanged', () => {
    expect(formatModel('claude-3-5-sonnet')).toBe('claude-3-5-sonnet');
  });

  it('renders the id with the provider when both are present and distinct', () => {
    expect(formatModel({ id: 'minimax-m3', providerID: 'opencode-go' })).toBe(
      'minimax-m3 (opencode-go)',
    );
  });

  it('renders the id alone when providerID is absent', () => {
    expect(formatModel({ id: 'gpt-4o' })).toBe('gpt-4o');
  });

  it('does not append a provider that matches the id', () => {
    expect(formatModel({ id: 'gpt-4o', providerID: 'gpt-4o' })).toBe('gpt-4o');
  });

  it('renders null as an empty string', () => {
    expect(formatModel(null)).toBe('');
  });

  it('renders undefined as an empty string', () => {
    expect(formatModel(undefined)).toBe('');
  });

  it('renders an object without an id as an empty string', () => {
    expect(formatModel({})).toBe('');
  });

  it('parses a JSON-string model and renders id with provider', () => {
    expect(formatModel('{"id":"minimax-m3","providerID":"opencode-go"}')).toBe(
      'minimax-m3 (opencode-go)',
    );
  });
});
