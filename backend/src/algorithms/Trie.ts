/**
 * Trie (prefix tree) for fast prefix-based autocomplete.
 *
 * Use case: As a user types a merchant name, suggest matching merchants
 * from their previous receipts in O(L) where L = prefix length.
 *
 * Comparison with alternatives:
 *   • SQL `LIKE 'prefix%'`: O(N × L) per query, hits the database
 *   • Linear scan in memory: O(N × L) per query
 *   • Trie: O(L) to navigate to prefix node, O(K) to enumerate K matches
 *
 * Memory: O(total characters across all stored words) in the worst case,
 * but in practice much lower due to shared prefixes (e.g. "Starbucks",
 * "Star", "Starr's Cafe" all share the "Star" prefix).
 *
 * This implementation:
 *   • Case-insensitive
 *   • Tracks frequency for ranking suggestions by popularity
 *   • Returns top-K suggestions sorted by frequency (recently / often used first)
 */

interface TrieNode {
  children: Map<string, TrieNode>;
  /** Stores the original cased word at terminal nodes. */
  word: string | null;
  /** How many times this word has been added — drives ranking. */
  frequency: number;
}

function makeNode(): TrieNode {
  return { children: new Map(), word: null, frequency: 0 };
}

export class Trie {
  private root: TrieNode = makeNode();
  private wordCount = 0;

  /** Number of distinct words in the trie. */
  get size(): number {
    return this.wordCount;
  }

  /**
   * Insert a word, or increment its frequency if it already exists.
   * Time complexity: O(L) where L = word length.
   */
  insert(word: string): void {
    if (!word) return;
    const normalized = word.toLowerCase();
    let node = this.root;

    for (const ch of normalized) {
      let next = node.children.get(ch);
      if (!next) {
        next = makeNode();
        node.children.set(ch, next);
      }
      node = next;
    }

    if (node.word === null) {
      node.word = word;
      this.wordCount++;
    }
    node.frequency++;
  }

  /**
   * Remove a word entirely (or decrement frequency if `removeOne`).
   * Time: O(L).
   */
  remove(word: string, removeOne = false): boolean {
    if (!word) return false;
    const normalized = word.toLowerCase();
    const path: Array<{ parent: TrieNode; char: string; node: TrieNode }> = [];
    let node = this.root;

    for (const ch of normalized) {
      const next = node.children.get(ch);
      if (!next) return false;
      path.push({ parent: node, char: ch, node: next });
      node = next;
    }

    if (node.word === null) return false;

    if (removeOne && node.frequency > 1) {
      node.frequency--;
      return true;
    }

    node.word = null;
    node.frequency = 0;
    this.wordCount--;

    // Prune dead branches walking back up the path
    for (let i = path.length - 1; i >= 0; i--) {
      const { parent, char, node: n } = path[i];
      if (n.children.size === 0 && n.word === null) {
        parent.children.delete(char);
      } else {
        break;
      }
    }

    return true;
  }

  /**
   * Find all words starting with the given prefix.
   * Returns top `limit` results sorted by frequency descending.
   *
   * Time: O(L + K log K) where K = number of matches under prefix.
   * Without sorting: O(L + K).
   */
  search(prefix: string, limit = 10): Array<{ word: string; frequency: number }> {
    if (limit <= 0) return [];
    const normalized = prefix.toLowerCase();
    let node = this.root;

    // Navigate to the prefix node
    for (const ch of normalized) {
      const next = node.children.get(ch);
      if (!next) return [];
      node = next;
    }

    // BFS/DFS to collect all words under this node
    const results: Array<{ word: string; frequency: number }> = [];
    this.collectWords(node, results);

    // Sort by frequency descending, then alphabetically as tiebreaker
    results.sort((a, b) => b.frequency - a.frequency || a.word.localeCompare(b.word));
    return results.slice(0, limit);
  }

  /** Returns true if the exact word exists in the trie. */
  has(word: string): boolean {
    if (!word) return false;
    const normalized = word.toLowerCase();
    let node = this.root;
    for (const ch of normalized) {
      const next = node.children.get(ch);
      if (!next) return false;
      node = next;
    }
    return node.word !== null;
  }

  /** Frequency of a word, or 0 if not present. */
  frequency(word: string): number {
    if (!word) return 0;
    const normalized = word.toLowerCase();
    let node = this.root;
    for (const ch of normalized) {
      const next = node.children.get(ch);
      if (!next) return 0;
      node = next;
    }
    return node.frequency;
  }

  /** Build a trie from an iterable of words (e.g. user's existing receipts). */
  static fromWords(words: Iterable<string>): Trie {
    const trie = new Trie();
    for (const w of words) trie.insert(w);
    return trie;
  }

  private collectWords(node: TrieNode, out: Array<{ word: string; frequency: number }>): void {
    if (node.word !== null) {
      out.push({ word: node.word, frequency: node.frequency });
    }
    for (const child of node.children.values()) {
      this.collectWords(child, out);
    }
  }
}
