/**
 * Journal Entry Models
 * 
 * Exports all journal entry model functions and constants
 */

export {
  createJournalEntry as createJournalEntryModel,
  normalizeJournalEntry,
  createEmptySlateValue
} from './Journal.js';

export {
  validateJournalEntry,
  validateAndSanitizeJournalEntry,
  validateContent,
  validateDate,
  validateTemplate,
  validateMood,
  validateTags,
  validateMedia,
  validateLinkedIds,
  JournalValidationError
} from './validateJournal.js';

export { default as Journal } from './Journal.js';
export { default as validateJournal } from './validateJournal.js';

