/**
 * Journal Widget Component
 * 
 * Displays recent journal entries or prompts for today's entry
 */

import { useState, useEffect } from 'react';
import { getJournalEntries } from '../../journal/crud/index.js';
import { Button } from '../Button/index.js';
import { navigateTo } from '../../utils/navigation.js';

export default function JournalWidget() {
  const [entries, setEntries] = useState([]);
  const [todayEntry, setTodayEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get all entries and filter client-side for today (more reliable than IndexedDB date range)
      const allEntries = await getJournalEntries().catch(() => []);
      
      // Find today's entry by comparing dates
      const todayEntryData = (allEntries || []).find(entry => {
        if (!entry || !entry.date) return false;
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === today.getTime();
      }) || null;
      
      setTodayEntry(todayEntryData);
      
      // Get recent entries (last 3, excluding today)
      const filteredEntries = (allEntries || [])
        .filter(entry => {
          if (!entry || !entry.date) return false;
          const entryDate = new Date(entry.date);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() !== today.getTime();
        })
        .sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB.getTime() - dateA.getTime(); // Most recent first
        })
        .slice(0, 3);
      
      setEntries(filteredEntries);
    } catch (err) {
      console.error('Error loading journal entries:', err);
      setError(`Failed to load journal entries: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPreviewText = (content) => {
    if (!content) return 'No content';
    
    // Handle Slate.js content structure
    if (Array.isArray(content)) {
      const text = content
        .map(node => {
          if (typeof node === 'string') return node;
          if (node.text) return node.text;
          if (node.children) {
            return node.children
              .map(child => typeof child === 'string' ? child : child.text || '')
              .join('');
          }
          return '';
        })
        .join(' ')
        .trim();
      
      return text.length > 100 ? text.substring(0, 100) + '...' : text;
    }
    
    // Fallback for plain text
    const text = String(content);
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  };

  if (loading) {
    return (
      <div className="card-glow h-full p-4">
        <h3 className="text-lg font-semibold mb-4">Journal</h3>
        <div className="text-dark-text-tertiary text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-glow h-full p-4">
        <h3 className="text-lg font-semibold mb-4">Journal</h3>
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="card-glow h-full p-4 flex flex-col overflow-hidden">
      <h3 className="text-lg font-semibold mb-4 flex-shrink-0">Journal</h3>
      
      {todayEntry ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="p-3 rounded-lg bg-dark-bg-secondary border border-purple-500/50 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-400">Today</span>
              {todayEntry.mood && (
                <span className="text-xs text-dark-text-tertiary">
                  {todayEntry.mood}
                </span>
              )}
            </div>
            <p className="text-sm text-dark-text-primary line-clamp-3">
              {getPreviewText(todayEntry.content)}
            </p>
          </div>
          
          {entries.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-dark-text-tertiary font-medium mb-2">Recent Entries</p>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-2 rounded-lg bg-dark-bg-secondary border border-dark-border hover:border-purple-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-dark-text-tertiary">
                      {formatDate(entry.date)}
                    </span>
                    {entry.mood && (
                      <span className="text-xs text-dark-text-tertiary">
                        {entry.mood}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-dark-text-primary line-clamp-2">
                    {getPreviewText(entry.content)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-dark-text-tertiary text-sm text-center mb-4">
            No entry for today
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigateTo('journal', { newEntry: true })}
          >
            Write Today's Entry
          </Button>
          
          {entries.length > 0 && (
            <div className="mt-6 w-full">
              <p className="text-xs text-dark-text-tertiary font-medium mb-2">Recent Entries</p>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2 rounded-lg bg-dark-bg-secondary border border-dark-border hover:border-purple-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-dark-text-tertiary">
                        {formatDate(entry.date)}
                      </span>
                      {entry.mood && (
                        <span className="text-xs text-dark-text-tertiary">
                          {entry.mood}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-dark-text-primary line-clamp-2">
                      {getPreviewText(entry.content)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-dark-border flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateTo('journal')}
          className="w-full"
        >
          View All Entries
        </Button>
      </div>
    </div>
  );
}

