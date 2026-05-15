import { describe, it, expect } from 'vitest';
import { Trie } from '../algorithms/Trie.js';

describe('Trie', () => {
  describe('basic insert / search', () => {
    it('finds inserted words by exact prefix', () => {
      const trie = new Trie();
      trie.insert('Starbucks');
      trie.insert('Starr Cafe');

      const matches = trie.search('star').map(m => m.word);
      expect(matches).toEqual(expect.arrayContaining(['Starbucks', 'Starr Cafe']));
    });

    it('returns empty for non-matching prefix', () => {
      const trie = new Trie();
      trie.insert('Amazon');
      expect(trie.search('zzz')).toEqual([]);
    });

    it('is case-insensitive on lookup', () => {
      const trie = new Trie();
      trie.insert('Starbucks');
      expect(trie.search('STAR')).toHaveLength(1);
      expect(trie.search('star')).toHaveLength(1);
    });

    it('preserves original casing in returned word', () => {
      const trie = new Trie();
      trie.insert('Starbucks');
      expect(trie.search('star')[0].word).toBe('Starbucks');
    });
  });

  describe('frequency tracking', () => {
    it('increments frequency on duplicate inserts', () => {
      const trie = new Trie();
      trie.insert('Swiggy');
      trie.insert('Swiggy');
      trie.insert('Swiggy');
      expect(trie.frequency('Swiggy')).toBe(3);
    });

    it('does not double-count distinct words', () => {
      const trie = new Trie();
      trie.insert('Amazon');
      trie.insert('Apple');
      expect(trie.size).toBe(2);
    });

    it('ranks search results by frequency descending', () => {
      const trie = new Trie();
      trie.insert('Amazon');
      trie.insert('Apple');
      trie.insert('Apple');
      trie.insert('Apple');
      trie.insert('Adidas');
      trie.insert('Adidas');

      const matches = trie.search('a', 5);
      expect(matches[0].word).toBe('Apple');     // 3 inserts
      expect(matches[1].word).toBe('Adidas');    // 2 inserts
      expect(matches[2].word).toBe('Amazon');    // 1 insert
    });
  });

  describe('limit parameter', () => {
    it('respects the limit', () => {
      const trie = new Trie();
      for (let i = 0; i < 20; i++) trie.insert(`Apple${i}`);

      const matches = trie.search('apple', 5);
      expect(matches).toHaveLength(5);
    });

    it('returns empty array for limit <= 0', () => {
      const trie = new Trie();
      trie.insert('test');
      expect(trie.search('test', 0)).toEqual([]);
    });
  });

  describe('has() / frequency()', () => {
    it('reports presence correctly', () => {
      const trie = new Trie();
      trie.insert('Hello');
      expect(trie.has('Hello')).toBe(true);
      expect(trie.has('hello')).toBe(true); // case-insensitive
      expect(trie.has('Hell')).toBe(false); // prefix is not full word
      expect(trie.has('HelloWorld')).toBe(false);
    });
  });

  describe('remove', () => {
    it('removes a word and prunes the branch', () => {
      const trie = new Trie();
      trie.insert('test');
      trie.insert('testing');

      const removed = trie.remove('test');
      expect(removed).toBe(true);
      expect(trie.has('test')).toBe(false);
      expect(trie.has('testing')).toBe(true); // sibling preserved
    });

    it('returns false when removing absent word', () => {
      const trie = new Trie();
      expect(trie.remove('nothing')).toBe(false);
    });

    it('decrements frequency when removeOne=true', () => {
      const trie = new Trie();
      trie.insert('foo');
      trie.insert('foo');
      trie.insert('foo');

      trie.remove('foo', true);
      expect(trie.frequency('foo')).toBe(2);
      expect(trie.has('foo')).toBe(true);
    });
  });

  describe('static fromWords', () => {
    it('builds a trie from an iterable', () => {
      const trie = Trie.fromWords(['Amazon', 'Apple', 'Apple']);
      expect(trie.size).toBe(2);
      expect(trie.frequency('Apple')).toBe(2);
    });
  });

  describe('correctness vs brute force', () => {
    it('returns the same suggestions as a linear scan', () => {
      const merchants = [
        'Starbucks', 'Star Pizza', 'Stark Industries', 'Steak House',
        'Amazon', 'Apple Store', 'Adidas', 'Aldi',
        'Subway', 'Spotify',
      ];
      const trie = Trie.fromWords(merchants);
      const prefix = 'sta';

      // Trie result
      const trieMatches = new Set(trie.search(prefix, 100).map(m => m.word));

      // Brute-force result
      const bruteMatches = new Set(
        merchants.filter(m => m.toLowerCase().startsWith(prefix.toLowerCase()))
      );

      expect(trieMatches).toEqual(bruteMatches);
    });
  });

  describe('edge cases', () => {
    it('handles empty strings gracefully', () => {
      const trie = new Trie();
      trie.insert('');
      expect(trie.size).toBe(0);
      expect(trie.search('', 5)).toEqual([]);
    });

    it('handles very long words', () => {
      const trie = new Trie();
      const long = 'a'.repeat(1000);
      trie.insert(long);
      expect(trie.has(long)).toBe(true);
    });

    it('supports unicode', () => {
      const trie = new Trie();
      trie.insert('Café');
      trie.insert('Cabbage');
      const matches = trie.search('cab').map(m => m.word);
      expect(matches).toContain('Cabbage');
    });
  });
});
