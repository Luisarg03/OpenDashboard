import { describe, expect, it } from 'vitest';

import { modelTags, parseModelField } from './model-tags';

describe('parseModelField', () => {
  it('normalizes null, JSON-string, plain-string, and object inputs', () => {
    expect(parseModelField(null)).toBeNull();
    expect(parseModelField(undefined)).toBeNull();
    expect(parseModelField('{"id":"minimax-m3","providerID":"opencode-go"}')).toEqual({
      id: 'minimax-m3',
      providerID: 'opencode-go',
    });
    expect(parseModelField('claude-3-5-sonnet')).toBe('claude-3-5-sonnet');
    expect(parseModelField({ id: 'gpt-4o' })).toEqual({ id: 'gpt-4o' });
  });

  it('returns the string as-is when JSON parsing fails', () => {
    expect(parseModelField('{not valid json')).toBe('{not valid json');
  });
});

describe('modelTags', () => {
  it('returns a single id tag for a string model', () => {
    expect(modelTags('claude-3-5-sonnet')).toEqual([
      { kind: 'id', value: 'claude-3-5-sonnet' },
    ]);
  });

  it('returns provider, id, variant tags in order for a full object', () => {
    expect(
      modelTags({ id: 'minimax-m3', providerID: 'opencode-go', variant: 'thinking' }),
    ).toEqual([
      { kind: 'provider', value: 'opencode-go' },
      { kind: 'id', value: 'minimax-m3' },
      { kind: 'variant', value: 'thinking' },
    ]);
  });

  it('returns a single id tag for an object with only an id', () => {
    expect(modelTags({ id: 'gpt-4o' })).toEqual([{ kind: 'id', value: 'gpt-4o' }]);
  });

  it('returns a single provider tag for an object with only a providerID', () => {
    expect(modelTags({ providerID: 'opencode-go' })).toEqual([
      { kind: 'provider', value: 'opencode-go' },
    ]);
  });

  it('skips an empty variant field', () => {
    expect(modelTags({ id: 'minimax-m3', providerID: 'opencode-go', variant: '' })).toEqual([
      { kind: 'provider', value: 'opencode-go' },
      { kind: 'id', value: 'minimax-m3' },
    ]);
  });

  it('returns an empty array for null, undefined, and empty objects', () => {
    expect(modelTags(null)).toEqual([]);
    expect(modelTags(undefined)).toEqual([]);
    expect(modelTags({})).toEqual([]);
  });

  it('parses a JSON-string model into provider, id, variant tags in order', () => {
    expect(
      modelTags('{"id":"minimax-m3","providerID":"opencode-go","variant":"thinking"}'),
    ).toEqual([
      { kind: 'provider', value: 'opencode-go' },
      { kind: 'id', value: 'minimax-m3' },
      { kind: 'variant', value: 'thinking' },
    ]);
  });

  it('parses a JSON-string model with surrounding whitespace', () => {
    expect(modelTags('  {"id":"x"}  ')).toEqual([{ kind: 'id', value: 'x' }]);
  });

  it('treats a malformed JSON string as a plain id tag', () => {
    expect(modelTags('{not valid json')).toEqual([{ kind: 'id', value: '{not valid json' }]);
  });
});
