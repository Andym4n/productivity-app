/**
 * Automation Models
 * Exports all automation-related models and validation functions
 */

export {
  createAutomationRule,
  normalizeAutomationRule,
  toJsonRulesEngineFormat,
  TRIGGER_TYPES,
  ACTION_TYPES,
  SCHEDULE_TYPES
} from './AutomationRule.js';

export {
  validateAutomationRule,
  validateAndSanitizeAutomationRule,
  validateName,
  validateDescription,
  validateTrigger,
  validateConditions,
  validateAction,
  validateActions,
  AutomationRuleValidationError
} from './validateAutomationRule.js';

export { default as AutomationRule } from './AutomationRule.js';
export { default as validateAutomationRule } from './validateAutomationRule.js';

