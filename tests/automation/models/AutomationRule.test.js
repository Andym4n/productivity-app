import { describe, it, expect } from 'vitest';
import {
  createAutomationRule,
  normalizeAutomationRule,
  toJsonRulesEngineFormat,
  TRIGGER_TYPES,
  ACTION_TYPES,
  SCHEDULE_TYPES
} from '../../../src/automation/models/AutomationRule.js';
import {
  validateAutomationRule,
  validateAndSanitizeAutomationRule
} from '../../../src/automation/models/validateAutomationRule.js';

describe('AutomationRule Model', () => {
  describe('createAutomationRule', () => {
    it('should create a rule with default values', () => {
      const rule = createAutomationRule();
      
      expect(rule).toHaveProperty('id');
      expect(rule.name).toBe('');
      expect(rule.description).toBeNull();
      expect(rule.enabled).toBe(true);
      expect(rule.trigger).toHaveProperty('type', TRIGGER_TYPES.TASK_CREATED);
      expect(rule.trigger).toHaveProperty('config', {});
      expect(rule.conditions).toHaveProperty('all', []);
      expect(rule.actions).toEqual([]);
      expect(rule.priority).toBe(0);
      expect(rule.executionCount).toBe(0);
      expect(rule.lastExecutedAt).toBeNull();
      expect(rule.createdAt).toBeDefined();
      expect(rule.updatedAt).toBeDefined();
    });

    it('should create a rule with provided data', () => {
      const ruleData = {
        name: 'Test Rule',
        description: 'Test Description',
        enabled: false,
        trigger: {
          type: TRIGGER_TYPES.TASK_COMPLETED,
          config: {}
        },
        conditions: {
          all: [{
            fact: 'task.priority',
            operator: 'equals',
            value: 'high'
          }]
        },
        actions: [{
          type: ACTION_TYPES.SEND_NOTIFICATION,
          params: { message: 'High priority task completed!' }
        }],
        priority: 10
      };
      
      const rule = createAutomationRule(ruleData);
      
      expect(rule.name).toBe('Test Rule');
      expect(rule.description).toBe('Test Description');
      expect(rule.enabled).toBe(false);
      expect(rule.trigger.type).toBe(TRIGGER_TYPES.TASK_COMPLETED);
      expect(rule.conditions.all).toHaveLength(1);
      expect(rule.actions).toHaveLength(1);
      expect(rule.priority).toBe(10);
    });
  });

  describe('normalizeAutomationRule', () => {
    it('should normalize date fields to ISO strings', () => {
      const now = new Date();
      const rule = createAutomationRule({
        lastExecutedAt: now,
        createdAt: now,
        updatedAt: now
      });
      
      const normalized = normalizeAutomationRule(rule);
      
      expect(normalized.lastExecutedAt).toBe(now.toISOString());
      expect(normalized.createdAt).toBe(now.toISOString());
      expect(normalized.updatedAt).toBe(now.toISOString());
    });

    it('should ensure conditions follow json-rules-engine format', () => {
      const rule = createAutomationRule({
        conditions: null
      });
      
      const normalized = normalizeAutomationRule(rule);
      
      expect(normalized.conditions).toHaveProperty('all', []);
    });

    it('should ensure actions is an array', () => {
      const rule = createAutomationRule({
        actions: null
      });
      
      const normalized = normalizeAutomationRule(rule);
      
      expect(Array.isArray(normalized.actions)).toBe(true);
    });
  });

  describe('toJsonRulesEngineFormat', () => {
    it('should convert rule to json-rules-engine format', () => {
      const rule = createAutomationRule({
        name: 'Test Rule',
        conditions: {
          all: [{
            fact: 'task.status',
            operator: 'equals',
            value: 'completed'
          }]
        },
        actions: [{
          type: ACTION_TYPES.SEND_NOTIFICATION,
          params: { message: 'Task completed!' }
        }],
        priority: 5
      });
      
      const engineFormat = toJsonRulesEngineFormat(rule);
      
      expect(engineFormat).toHaveProperty('conditions');
      expect(engineFormat).toHaveProperty('event');
      expect(engineFormat.event).toHaveProperty('type', 'automation-action');
      expect(engineFormat.event.params).toHaveProperty('ruleId', rule.id);
      expect(engineFormat.event.params).toHaveProperty('actions');
      expect(engineFormat.event.params).toHaveProperty('priority', 5);
      expect(engineFormat).toHaveProperty('priority', 5);
    });
  });

  describe('validateAutomationRule', () => {
    it('should validate a valid rule', () => {
      const rule = createAutomationRule({
        name: 'Valid Rule',
        trigger: {
          type: TRIGGER_TYPES.TASK_CREATED,
          config: {}
        },
        conditions: {
          all: [{
            fact: 'task.priority',
            operator: 'equals',
            value: 'high'
          }]
        },
        actions: [{
          type: ACTION_TYPES.CATEGORIZE_TASK,
          params: {
            taskId: 'test-task-id',
            category: 'urgent'
          }
        }]
      });
      
      const result = validateAutomationRule(rule);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.rule).toEqual(rule);
    });

    it('should reject rule without name', () => {
      const rule = createAutomationRule({
        name: ''
      });
      
      const result = validateAutomationRule(rule);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject rule without actions', () => {
      const rule = createAutomationRule({
        name: 'Rule Without Actions',
        actions: []
      });
      
      const result = validateAutomationRule(rule);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Actions'))).toBe(true);
    });

    it('should reject rule with invalid trigger type', () => {
      const rule = createAutomationRule({
        name: 'Invalid Trigger Rule',
        trigger: {
          type: 'invalid.trigger',
          config: {}
        }
      });
      
      const result = validateAutomationRule(rule);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Trigger'))).toBe(true);
    });
  });

  describe('validateAndSanitizeAutomationRule', () => {
    it('should sanitize string fields', () => {
      const rule = createAutomationRule({
        name: '  Test Rule  ',
        description: '  Test Description  ',
        trigger: {
          type: TRIGGER_TYPES.TASK_CREATED,
          config: {}
        },
        conditions: {
          all: [{
            fact: 'task.priority',
            operator: 'equals',
            value: 'high'
          }]
        },
        actions: [{
          type: ACTION_TYPES.SEND_NOTIFICATION,
          params: { message: 'Test notification' }
        }]
      });
      
      const result = validateAndSanitizeAutomationRule(rule);
      
      expect(result.isValid).toBe(true);
      expect(result.rule.name).toBe('Test Rule');
      expect(result.rule.description).toBe('Test Description');
    });
  });
});

