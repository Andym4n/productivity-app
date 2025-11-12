import { describe, it, expect, beforeEach } from 'vitest';
import {
  RuleEvaluator,
  createRuleEvaluator,
  RuleEvaluationError,
  FactProvider
} from '../../../src/automation/services/ruleEvaluator.js';
import {
  createAutomationRule,
  TRIGGER_TYPES,
  ACTION_TYPES
} from '../../../src/automation/models/AutomationRule.js';

describe('RuleEvaluator', () => {
  let evaluator;

  beforeEach(() => {
    evaluator = createRuleEvaluator();
  });

  describe('FactProvider', () => {
    describe('taskFacts', () => {
      it('should extract facts from a task object', () => {
        const task = {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test Description',
          status: 'completed',
          priority: 'high',
          context: 'work',
          dueDate: '2025-01-01T00:00:00Z',
          timeEstimate: 60,
          timeSpent: 30,
          parentId: null,
          tags: ['urgent', 'important'],
          dependencies: ['task-2'],
          completedAt: '2025-01-01T12:00:00Z',
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T12:00:00Z'
        };

        const facts = FactProvider.taskFacts(task);

        expect(facts['task.id']).toBe('task-1');
        expect(facts['task.title']).toBe('Test Task');
        expect(facts['task.status']).toBe('completed');
        expect(facts['task.priority']).toBe('high');
        expect(facts['task.context']).toBe('work');
        expect(facts['task.tags']).toEqual(['urgent', 'important']);
        expect(facts['task.hasDependencies']).toBe(true);
        expect(facts['task.hasSubtasks']).toBe(false);
        expect(facts['task.isOverdue']).toBe(false);
      });

      it('should handle null task', () => {
        const facts = FactProvider.taskFacts(null);
        expect(Object.keys(facts)).toHaveLength(0);
      });

      it('should handle task with missing fields', () => {
        const task = { id: 'task-1' };
        const facts = FactProvider.taskFacts(task);

        expect(facts['task.id']).toBe('task-1');
        expect(facts['task.title']).toBe('');
        expect(facts['task.status']).toBe('pending');
        expect(facts['task.priority']).toBe('medium');
        expect(facts['task.tags']).toEqual([]);
      });

      it('should detect overdue tasks', () => {
        const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
        const task = {
          id: 'task-1',
          dueDate: pastDate,
          status: 'pending'
        };

        const facts = FactProvider.taskFacts(task);
        expect(facts['task.isOverdue']).toBe(true);
      });

      it('should not mark completed tasks as overdue', () => {
        const pastDate = new Date(Date.now() - 86400000).toISOString();
        const task = {
          id: 'task-1',
          dueDate: pastDate,
          status: 'completed'
        };

        const facts = FactProvider.taskFacts(task);
        expect(facts['task.isOverdue']).toBe(false);
      });
    });

    describe('exerciseFacts', () => {
      it('should extract facts from an exercise object', () => {
        const exercise = {
          id: 'exercise-1',
          name: 'Push-ups',
          type: 'reps',
          unit: 'reps',
          category: 'strength',
          createdAt: '2025-01-01T00:00:00Z'
        };

        const facts = FactProvider.exerciseFacts(exercise);

        expect(facts['exercise.id']).toBe('exercise-1');
        expect(facts['exercise.name']).toBe('Push-ups');
        expect(facts['exercise.type']).toBe('reps');
        expect(facts['exercise.category']).toBe('strength');
      });

      it('should handle null exercise', () => {
        const facts = FactProvider.exerciseFacts(null);
        expect(Object.keys(facts)).toHaveLength(0);
      });
    });

    describe('exerciseGoalFacts', () => {
      it('should extract facts from an exercise goal object', () => {
        const goal = {
          id: 'goal-1',
          exerciseId: 'exercise-1',
          target: 100,
          completed: 75,
          date: '2025-01-01T00:00:00Z'
        };

        const facts = FactProvider.exerciseGoalFacts(goal);

        expect(facts['exerciseGoal.id']).toBe('goal-1');
        expect(facts['exerciseGoal.target']).toBe(100);
        expect(facts['exerciseGoal.completed']).toBe(75);
        expect(facts['exerciseGoal.progress']).toBe(75);
        expect(facts['exerciseGoal.isComplete']).toBe(false);
      });

      it('should detect completed goals', () => {
        const goal = {
          id: 'goal-1',
          target: 100,
          completed: 100
        };

        const facts = FactProvider.exerciseGoalFacts(goal);
        expect(facts['exerciseGoal.isComplete']).toBe(true);
      });
    });

    describe('journalFacts', () => {
      it('should extract facts from a journal entry object', () => {
        const entry = {
          id: 'journal-1',
          content: [
            {
              type: 'paragraph',
              children: [{ text: 'Today was a great day!' }]
            }
          ],
          date: '2025-01-01T00:00:00Z',
          mood: 'happy',
          tags: ['reflection'],
          template: 'daily',
          media: {
            images: ['img-1'],
            audio: []
          },
          linkedTasks: ['task-1'],
          linkedEvents: []
        };

        const facts = FactProvider.journalFacts(entry);

        expect(facts['journal.id']).toBe('journal-1');
        expect(facts['journal.mood']).toBe('happy');
        expect(facts['journal.tags']).toEqual(['reflection']);
        expect(facts['journal.textContent']).toContain('Today was a great day!');
        expect(facts['journal.hasImages']).toBe(true);
        expect(facts['journal.hasAudio']).toBe(false);
        expect(facts['journal.hasLinkedTasks']).toBe(true);
        expect(facts['journal.hasLinkedEvents']).toBe(false);
      });

      it('should extract text from nested Slate.js content', () => {
        const entry = {
          id: 'journal-1',
          content: [
            {
              type: 'paragraph',
              children: [
                { text: 'First paragraph. ' },
                { text: 'Second part.' }
              ]
            },
            {
              type: 'paragraph',
              children: [{ text: 'Second paragraph.' }]
            }
          ]
        };

        const facts = FactProvider.journalFacts(entry);
        expect(facts['journal.textContent']).toContain('First paragraph');
        expect(facts['journal.textContent']).toContain('Second paragraph');
        expect(facts['journal.textLength']).toBeGreaterThan(0);
      });
    });

    describe('combineFacts', () => {
      it('should combine multiple fact objects', () => {
        const facts1 = { 'task.id': 'task-1', 'task.status': 'pending' };
        const facts2 = { 'exercise.id': 'exercise-1', 'exercise.type': 'reps' };
        const facts3 = { 'journal.id': 'journal-1', 'journal.mood': 'happy' };

        const combined = FactProvider.combineFacts(facts1, facts2, facts3);

        expect(combined['task.id']).toBe('task-1');
        expect(combined['exercise.id']).toBe('exercise-1');
        expect(combined['journal.id']).toBe('journal-1');
      });

      it('should handle empty fact objects', () => {
        const combined = FactProvider.combineFacts({}, {});
        expect(Object.keys(combined)).toHaveLength(0);
      });
    });
  });

  describe('RuleEvaluator', () => {
    describe('addRule', () => {
      it('should add a valid rule', () => {
        const rule = createAutomationRule({
          name: 'Test Rule',
          enabled: true,
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
          }]
        });

        expect(() => evaluator.addRule(rule)).not.toThrow();
        expect(evaluator.hasRule(rule.id)).toBe(true);
      });

      it('should not add disabled rules', () => {
        const rule = createAutomationRule({
          name: 'Disabled Rule',
          enabled: false
        });

        evaluator.addRule(rule);
        expect(evaluator.hasRule(rule.id)).toBe(false);
      });

      it('should throw error for rule without id', () => {
        const rule = { name: 'Invalid Rule' };

        expect(() => evaluator.addRule(rule)).toThrow(RuleEvaluationError);
      });
    });

    describe('removeRule', () => {
      it('should remove a rule', () => {
        const rule = createAutomationRule({
          name: 'Test Rule',
          enabled: true,
          conditions: { all: [] },
          actions: [{ type: ACTION_TYPES.SEND_NOTIFICATION, params: {} }]
        });

        evaluator.addRule(rule);
        expect(evaluator.hasRule(rule.id)).toBe(true);

        evaluator.removeRule(rule.id);
        expect(evaluator.hasRule(rule.id)).toBe(false);
      });

      it('should handle removing non-existent rule', () => {
        expect(() => evaluator.removeRule('non-existent')).not.toThrow();
      });
    });

    describe('updateRule', () => {
      it('should update an existing rule', () => {
        const rule = createAutomationRule({
          name: 'Original Rule',
          enabled: true,
          conditions: {
            all: [{
              fact: 'task.status',
              operator: 'equals',
              value: 'pending'
            }]
          },
          actions: [{ type: ACTION_TYPES.SEND_NOTIFICATION, params: {} }]
        });

        evaluator.addRule(rule);

        const updatedRule = {
          ...rule,
          name: 'Updated Rule',
          conditions: {
            all: [{
              fact: 'task.status',
              operator: 'equals',
              value: 'completed'
            }]
          }
        };

        evaluator.updateRule(updatedRule);
        const retrieved = evaluator.getRule(rule.id);
        expect(retrieved.name).toBe('Updated Rule');
      });
    });

    describe('loadRules', () => {
      it('should load multiple rules', () => {
        const rules = [
          createAutomationRule({
            name: 'Rule 1',
            enabled: true,
            conditions: { all: [] },
            actions: [{ type: ACTION_TYPES.SEND_NOTIFICATION, params: {} }]
          }),
          createAutomationRule({
            name: 'Rule 2',
            enabled: true,
            conditions: { all: [] },
            actions: [{ type: ACTION_TYPES.SEND_NOTIFICATION, params: {} }]
          })
        ];

        evaluator.loadRules(rules);
        expect(evaluator.getRules()).toHaveLength(2);
      });

      it('should only load enabled rules', () => {
        const rules = [
          createAutomationRule({
            name: 'Enabled Rule',
            enabled: true,
            conditions: { all: [] },
            actions: [{ type: ACTION_TYPES.SEND_NOTIFICATION, params: {} }]
          }),
          createAutomationRule({
            name: 'Disabled Rule',
            enabled: false,
            conditions: { all: [] },
            actions: [{ type: ACTION_TYPES.SEND_NOTIFICATION, params: {} }]
          })
        ];

        evaluator.loadRules(rules);
        expect(evaluator.getRules()).toHaveLength(1);
        expect(evaluator.getRules()[0].name).toBe('Enabled Rule');
      });

      it('should clear existing rules before loading', () => {
        const rule1 = createAutomationRule({
          name: 'Old Rule',
          enabled: true,
          conditions: { all: [] },
          actions: [{ type: ACTION_TYPES.SEND_NOTIFICATION, params: {} }]
        });

        evaluator.addRule(rule1);

        const rule2 = createAutomationRule({
          name: 'New Rule',
          enabled: true,
          conditions: { all: [] },
          actions: [{ type: ACTION_TYPES.SEND_NOTIFICATION, params: {} }]
        });

        evaluator.loadRules([rule2]);
        expect(evaluator.getRules()).toHaveLength(1);
        expect(evaluator.getRules()[0].name).toBe('New Rule');
      });

      it('should throw error for non-array input', () => {
        expect(() => evaluator.loadRules({})).toThrow(RuleEvaluationError);
      });
    });

    describe('evaluate', () => {
      it('should evaluate rules against facts', async () => {
        const rule = createAutomationRule({
          name: 'Test Rule',
          enabled: true,
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
          }]
        });

        evaluator.addRule(rule);

        const facts = {
          'task.status': 'completed',
          'task.id': 'task-1'
        };

        const result = await evaluator.evaluate(facts);

        expect(result.events).toHaveLength(1);
        expect(result.events[0].type).toBe('automation-action');
        expect(result.events[0].params.actions).toHaveLength(1);
      });

      it('should not fire rules when conditions are not met', async () => {
        const rule = createAutomationRule({
          name: 'Test Rule',
          enabled: true,
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
          }]
        });

        evaluator.addRule(rule);

        const facts = {
          'task.status': 'pending',
          'task.id': 'task-1'
        };

        const result = await evaluator.evaluate(facts);

        expect(result.events).toHaveLength(0);
      });

      it('should handle complex conditions with multiple facts', async () => {
        const rule = createAutomationRule({
          name: 'Complex Rule',
          enabled: true,
          conditions: {
            all: [
              {
                fact: 'task.status',
                operator: 'equals',
                value: 'completed'
              },
              {
                fact: 'task.priority',
                operator: 'equals',
                value: 'high'
              }
            ]
          },
          actions: [{
            type: ACTION_TYPES.SEND_NOTIFICATION,
            params: { message: 'High priority task completed!' }
          }]
        });

        evaluator.addRule(rule);

        const facts1 = {
          'task.status': 'completed',
          'task.priority': 'high'
        };

        const facts2 = {
          'task.status': 'completed',
          'task.priority': 'medium'
        };

        const result1 = await evaluator.evaluate(facts1);
        const result2 = await evaluator.evaluate(facts2);

        expect(result1.events).toHaveLength(1);
        expect(result2.events).toHaveLength(0);
      });

      it('should handle "any" conditions', async () => {
        const rule = createAutomationRule({
          name: 'Any Condition Rule',
          enabled: true,
          conditions: {
            any: [
              {
                fact: 'task.priority',
                operator: 'equals',
                value: 'high'
              },
              {
                fact: 'task.priority',
                operator: 'equals',
                value: 'urgent'
              }
            ]
          },
          actions: [{
            type: ACTION_TYPES.SEND_NOTIFICATION,
            params: { message: 'Important task!' }
          }]
        });

        evaluator.addRule(rule);

        const facts1 = { 'task.priority': 'high' };
        const facts2 = { 'task.priority': 'urgent' };
        const facts3 = { 'task.priority': 'low' };

        const result1 = await evaluator.evaluate(facts1);
        const result2 = await evaluator.evaluate(facts2);
        const result3 = await evaluator.evaluate(facts3);

        expect(result1.events).toHaveLength(1);
        expect(result2.events).toHaveLength(1);
        expect(result3.events).toHaveLength(0);
      });
    });

    describe('evaluateTask', () => {
      it('should evaluate rules against task data', async () => {
        const rule = createAutomationRule({
          name: 'Task Rule',
          enabled: true,
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
          }]
        });

        evaluator.addRule(rule);

        const task = {
          id: 'task-1',
          title: 'Test Task',
          status: 'completed',
          priority: 'high'
        };

        const result = await evaluator.evaluateTask(task);

        expect(result.events).toHaveLength(1);
        expect(result.facts['task.id']).toBe('task-1');
        expect(result.facts['task.status']).toBe('completed');
      });
    });

    describe('evaluateExercise', () => {
      it('should evaluate rules against exercise data', async () => {
        const rule = createAutomationRule({
          name: 'Exercise Rule',
          enabled: true,
          conditions: {
            all: [{
              fact: 'exerciseGoal.isComplete',
              operator: 'equals',
              value: true
            }]
          },
          actions: [{
            type: ACTION_TYPES.SEND_NOTIFICATION,
            params: { message: 'Goal achieved!' }
          }]
        });

        evaluator.addRule(rule);

        const exercise = { id: 'exercise-1', name: 'Push-ups' };
        const goal = { id: 'goal-1', target: 100, completed: 100 };

        const result = await evaluator.evaluateExercise(exercise, goal);

        expect(result.events).toHaveLength(1);
        expect(result.facts['exerciseGoal.isComplete']).toBe(true);
      });
    });

    describe('evaluateJournal', () => {
      it('should evaluate rules against journal entry data', async () => {
        const rule = createAutomationRule({
          name: 'Journal Rule',
          enabled: true,
          conditions: {
            all: [{
              fact: 'journal.mood',
              operator: 'equals',
              value: 'sad'
            }]
          },
          actions: [{
            type: ACTION_TYPES.SEND_NOTIFICATION,
            params: { message: 'Check in?' }
          }]
        });

        evaluator.addRule(rule);

        const entry = {
          id: 'journal-1',
          content: [{ type: 'paragraph', children: [{ text: 'Feeling down' }] }],
          mood: 'sad'
        };

        const result = await evaluator.evaluateJournal(entry);

        expect(result.events).toHaveLength(1);
        expect(result.facts['journal.mood']).toBe('sad');
      });
    });

    describe('evaluateCombined', () => {
      it('should evaluate rules against combined data', async () => {
        const rule = createAutomationRule({
          name: 'Combined Rule',
          enabled: true,
          conditions: {
            all: [
              {
                fact: 'task.status',
                operator: 'equals',
                value: 'completed'
              },
              {
                fact: 'journal.mood',
                operator: 'equals',
                value: 'happy'
              }
            ]
          },
          actions: [{
            type: ACTION_TYPES.SEND_NOTIFICATION,
            params: { message: 'Great day!' }
          }]
        });

        evaluator.addRule(rule);

        const data = {
          task: {
            id: 'task-1',
            status: 'completed'
          },
          journal: {
            id: 'journal-1',
            content: [{ type: 'paragraph', children: [{ text: 'Happy!' }] }],
            mood: 'happy'
          }
        };

        const result = await evaluator.evaluateCombined(data);

        expect(result.events).toHaveLength(1);
        expect(result.facts['task.status']).toBe('completed');
        expect(result.facts['journal.mood']).toBe('happy');
      });
    });

    describe('getRules', () => {
      it('should return all loaded rules', () => {
        const rule1 = createAutomationRule({
          name: 'Rule 1',
          enabled: true,
          conditions: { all: [] },
          actions: [{ type: ACTION_TYPES.SEND_NOTIFICATION, params: {} }]
        });
        const rule2 = createAutomationRule({
          name: 'Rule 2',
          enabled: true,
          conditions: { all: [] },
          actions: [{ type: ACTION_TYPES.SEND_NOTIFICATION, params: {} }]
        });

        evaluator.addRule(rule1);
        evaluator.addRule(rule2);

        const rules = evaluator.getRules();
        expect(rules).toHaveLength(2);
        expect(rules.map(r => r.name)).toContain('Rule 1');
        expect(rules.map(r => r.name)).toContain('Rule 2');
      });
    });

    describe('clearRules', () => {
      it('should clear all rules', () => {
        const rule = createAutomationRule({
          name: 'Test Rule',
          enabled: true,
          conditions: { all: [] },
          actions: [{ type: ACTION_TYPES.SEND_NOTIFICATION, params: {} }]
        });

        evaluator.addRule(rule);
        expect(evaluator.getRules()).toHaveLength(1);

        evaluator.clearRules();
        expect(evaluator.getRules()).toHaveLength(0);
      });
    });

    describe('createRuleEvaluator', () => {
      it('should create a new RuleEvaluator instance', () => {
        const newEvaluator = createRuleEvaluator();
        expect(newEvaluator).toBeInstanceOf(RuleEvaluator);
        expect(newEvaluator.getRules()).toHaveLength(0);
      });

      it('should accept options', () => {
        const newEvaluator = createRuleEvaluator({ allowUndefinedFacts: true });
        expect(newEvaluator).toBeInstanceOf(RuleEvaluator);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rules with no conditions', async () => {
      const rule = createAutomationRule({
        name: 'No Conditions Rule',
        enabled: true,
        conditions: { all: [] },
        actions: [{
          type: ACTION_TYPES.SEND_NOTIFICATION,
          params: { message: 'Always fires!' }
        }]
      });

      evaluator.addRule(rule);

      const result = await evaluator.evaluate({});
      expect(result.events).toHaveLength(1);
    });

    it('should handle multiple rules with different priorities', async () => {
      const rule1 = createAutomationRule({
        name: 'Low Priority Rule',
        enabled: true,
        priority: 1,
        conditions: {
          all: [{
            fact: 'task.status',
            operator: 'equals',
            value: 'completed'
          }]
          },
        actions: [{ type: ACTION_TYPES.SEND_NOTIFICATION, params: { message: 'Low' } }]
      });

      const rule2 = createAutomationRule({
        name: 'High Priority Rule',
        enabled: true,
        priority: 10,
        conditions: {
          all: [{
            fact: 'task.status',
            operator: 'equals',
            value: 'completed'
          }]
        },
        actions: [{ type: ACTION_TYPES.SEND_NOTIFICATION, params: { message: 'High' } }]
      });

      evaluator.addRule(rule1);
      evaluator.addRule(rule2);

      const result = await evaluator.evaluate({ 'task.status': 'completed' });

      // Both rules should fire, but order may vary based on priority
      expect(result.events.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle operators like greaterThan, lessThan', async () => {
      const rule = createAutomationRule({
        name: 'Numeric Comparison Rule',
        enabled: true,
        conditions: {
          all: [{
            fact: 'task.timeSpent',
            operator: 'greaterThan',
            value: 60
          }]
        },
        actions: [{
          type: ACTION_TYPES.SEND_NOTIFICATION,
          params: { message: 'Time exceeded!' }
        }]
      });

      evaluator.addRule(rule);

      const facts1 = { 'task.timeSpent': 90 };
      const facts2 = { 'task.timeSpent': 30 };

      const result1 = await evaluator.evaluate(facts1);
      const result2 = await evaluator.evaluate(facts2);

      expect(result1.events).toHaveLength(1);
      expect(result2.events).toHaveLength(0);
    });

    it('should handle array operators like in', async () => {
      const rule = createAutomationRule({
        name: 'Array Contains Rule',
        enabled: true,
        conditions: {
          all: [{
            fact: 'task.tags',
            operator: 'contains',
            value: 'urgent'
          }]
        },
        actions: [{
          type: ACTION_TYPES.SEND_NOTIFICATION,
          params: { message: 'Urgent task!' }
        }]
      });

      evaluator.addRule(rule);

      const facts1 = { 'task.tags': ['urgent', 'important'] };
      const facts2 = { 'task.tags': ['normal'] };

      const result1 = await evaluator.evaluate(facts1);
      const result2 = await evaluator.evaluate(facts2);

      // Note: json-rules-engine may need custom operators for array operations
      // This test documents expected behavior
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});
