/**
 * Built-in Journal Templates
 * 
 * Pre-defined templates for common journaling patterns.
 * These templates are automatically created when the app initializes.
 */

/**
 * Gratitude Template
 */
export const gratitudeTemplate = {
  name: 'Gratitude Journal',
  description: 'List things you are grateful for today',
  content: [
    {
      type: 'heading-one',
      children: [{ text: 'Gratitude Journal' }]
    },
    {
      type: 'paragraph',
      children: [{ text: 'Today I am grateful for:' }]
    },
    {
      type: 'bulleted-list',
      children: [
        {
          type: 'list-item',
          children: [{ text: '' }]
        },
        {
          type: 'list-item',
          children: [{ text: '' }]
        },
        {
          type: 'list-item',
          children: [{ text: '' }]
        }
      ]
    }
  ],
  isBuiltIn: true,
  category: 'gratitude',
  tags: ['gratitude', 'reflection', 'positive']
};

/**
 * Daily Goals Template
 */
export const dailyGoalsTemplate = {
  name: 'Daily Goals',
  description: 'Set and track your daily goals',
  content: [
    {
      type: 'heading-one',
      children: [{ text: 'Daily Goals' }]
    },
    {
      type: 'paragraph',
      children: [{ text: 'Today I want to accomplish:' }]
    },
    {
      type: 'numbered-list',
      children: [
        {
          type: 'list-item',
          children: [{ text: '' }]
        },
        {
          type: 'list-item',
          children: [{ text: '' }]
        },
        {
          type: 'list-item',
          children: [{ text: '' }]
        }
      ]
    },
    {
      type: 'paragraph',
      children: [{ text: '' }]
    },
    {
      type: 'heading-two',
      children: [{ text: 'Reflection' }]
    },
    {
      type: 'paragraph',
      children: [{ text: 'How did today go? What did I learn?' }]
    }
  ],
  isBuiltIn: true,
  category: 'goals',
  tags: ['goals', 'planning', 'productivity']
};

/**
 * Mood Tracking Template
 */
export const moodTrackingTemplate = {
  name: 'Mood Tracker',
  description: 'Track your mood and emotions',
  content: [
    {
      type: 'heading-one',
      children: [{ text: 'Mood Tracker' }]
    },
    {
      type: 'paragraph',
      children: [{ text: 'How am I feeling today?' }]
    },
    {
      type: 'paragraph',
      children: [{ text: '' }]
    },
    {
      type: 'heading-two',
      children: [{ text: 'Emotions' }]
    },
    {
      type: 'paragraph',
      children: [{ text: 'What emotions am I experiencing?' }]
    },
    {
      type: 'bulleted-list',
      children: [
        {
          type: 'list-item',
          children: [{ text: '' }]
        }
      ]
    },
    {
      type: 'paragraph',
      children: [{ text: '' }]
    },
    {
      type: 'heading-two',
      children: [{ text: 'What influenced my mood?' }]
    },
    {
      type: 'paragraph',
      children: [{ text: '' }]
    }
  ],
  isBuiltIn: true,
  category: 'mood',
  tags: ['mood', 'emotions', 'wellness']
};

/**
 * Reflection Template
 */
export const reflectionTemplate = {
  name: 'Daily Reflection',
  description: 'Reflect on your day and experiences',
  content: [
    {
      type: 'heading-one',
      children: [{ text: 'Daily Reflection' }]
    },
    {
      type: 'heading-two',
      children: [{ text: 'What went well?' }]
    },
    {
      type: 'paragraph',
      children: [{ text: '' }]
    },
    {
      type: 'heading-two',
      children: [{ text: 'What could have gone better?' }]
    },
    {
      type: 'paragraph',
      children: [{ text: '' }]
    },
    {
      type: 'heading-two',
      children: [{ text: 'What did I learn?' }]
    },
    {
      type: 'paragraph',
      children: [{ text: '' }]
    },
    {
      type: 'heading-two',
      children: [{ text: 'Tomorrow I will focus on:' }]
    },
    {
      type: 'paragraph',
      children: [{ text: '' }]
    }
  ],
  isBuiltIn: true,
  category: 'reflection',
  tags: ['reflection', 'learning', 'growth']
};

/**
 * Morning Pages Template
 */
export const morningPagesTemplate = {
  name: 'Morning Pages',
  description: 'Free-form writing to start your day',
  content: [
    {
      type: 'heading-one',
      children: [{ text: 'Morning Pages' }]
    },
    {
      type: 'paragraph',
      children: [{ text: 'Write freely about whatever comes to mind...' }]
    },
    {
      type: 'paragraph',
      children: [{ text: '' }]
    }
  ],
  isBuiltIn: true,
  category: 'general',
  tags: ['morning', 'free-form', 'writing']
};

/**
 * All built-in templates
 */
export const builtInTemplates = [
  gratitudeTemplate,
  dailyGoalsTemplate,
  moodTrackingTemplate,
  reflectionTemplate,
  morningPagesTemplate
];

export default builtInTemplates;

