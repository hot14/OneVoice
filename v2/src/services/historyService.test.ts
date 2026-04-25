import { describe, it, expect, beforeEach } from 'vitest';
import {
  getHistory,
  saveHistoryItem,
  getHistoryItem,
  deleteHistoryItem,
  HistoryItem,
} from './historyService';

function makeItem(overrides: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: 'item-1',
    title: 'Test Session',
    langs: 'ko-en',
    date: '2026-04-25',
    duration: '5:00',
    participants: '2',
    type: 'translate',
    summary: 'Test summary',
    script: [],
    ...overrides,
  };
}

describe('historyService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when storage has no history', () => {
    expect(getHistory()).toEqual([]);
  });

  it('returns empty array when stored data is malformed JSON', () => {
    localStorage.setItem('onevoice_history', 'not-json{{{');
    expect(getHistory()).toEqual([]);
  });

  it('saves an item so it is retrievable via getHistory', () => {
    const item = makeItem();
    saveHistoryItem(item);
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('item-1');
  });

  it('prepends new item so the most-recently saved item appears first', () => {
    saveHistoryItem(makeItem({ id: 'first' }));
    saveHistoryItem(makeItem({ id: 'second' }));
    const history = getHistory();
    expect(history[0].id).toBe('second');
    expect(history[1].id).toBe('first');
  });

  it('returns the correct item by id via getHistoryItem', () => {
    saveHistoryItem(makeItem({ id: 'abc', title: 'Meeting' }));
    const found = getHistoryItem('abc');
    expect(found).toBeDefined();
    expect(found!.title).toBe('Meeting');
  });

  it('returns undefined when id does not exist in history', () => {
    saveHistoryItem(makeItem({ id: 'real-id' }));
    expect(getHistoryItem('nonexistent')).toBeUndefined();
  });

  it('removes the item so it is no longer retrievable after deleteHistoryItem', () => {
    saveHistoryItem(makeItem({ id: 'del-me' }));
    deleteHistoryItem('del-me');
    expect(getHistoryItem('del-me')).toBeUndefined();
  });

  it('preserves other items when a specific item is deleted', () => {
    saveHistoryItem(makeItem({ id: 'keep' }));
    saveHistoryItem(makeItem({ id: 'remove' }));
    deleteHistoryItem('remove');
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('keep');
  });

  it('maintains insertion-prepend order across multiple saved items', () => {
    const ids = ['a', 'b', 'c'];
    ids.forEach((id) => saveHistoryItem(makeItem({ id })));
    const history = getHistory();
    expect(history.map((h) => h.id)).toEqual(['c', 'b', 'a']);
  });
});
