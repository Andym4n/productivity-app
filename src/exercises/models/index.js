/**
 * Exercise Models
 * 
 * Exports all exercise-related models and validation functions
 */

export {
  createExercise,
  createExerciseGoal,
  createExerciseLog,
  normalizeExercise,
  normalizeExerciseGoal,
  normalizeExerciseLog,
  EXERCISE_TYPES
} from './Exercise.js';

export {
  validateExercise,
  validateExerciseGoal,
  validateExerciseLog,
  validateAndSanitizeExercise,
  validateAndSanitizeExerciseGoal,
  validateAndSanitizeExerciseLog,
  validateExerciseName,
  validateExerciseType,
  validateExerciseUnit,
  validateExerciseCategory,
  validateDate,
  ExerciseValidationError
} from './validateExercise.js';

