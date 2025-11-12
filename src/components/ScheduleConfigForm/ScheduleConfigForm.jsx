/**
 * Schedule Configuration Form Component
 * 
 * Form for creating and editing work schedule configurations
 */

import { useState, useEffect } from 'react';
import { Button, Input } from '../index.js';
import { 
  createSchedule, 
  updateSchedule, 
  getSchedule,
  SCHEDULE_TYPES,
  DAYS_OF_WEEK 
} from '../../schedule/index.js';

/**
 * ScheduleConfigForm component
 * @param {Object} props
 * @param {string|null} props.scheduleId - Schedule ID for editing (null for new schedule)
 * @param {Function} props.onSave - Callback when schedule is saved
 * @param {Function} props.onCancel - Callback when form is cancelled
 */
export default function ScheduleConfigForm({ scheduleId = null, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleType, setScheduleType] = useState(SCHEDULE_TYPES.FIXED);
  const [defaultStartTime, setDefaultStartTime] = useState('09:00');
  const [defaultEndTime, setDefaultEndTime] = useState('17:00');
  const [breakDuration, setBreakDuration] = useState(60);
  const [minHoursPerDay, setMinHoursPerDay] = useState(4);
  const [maxHoursPerDay, setMaxHoursPerDay] = useState(10);
  const [minHoursPerWeek, setMinHoursPerWeek] = useState(20);
  const [maxHoursPerWeek, setMaxHoursPerWeek] = useState(50);
  const [preferredWorkDays, setPreferredWorkDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri
  const [weeklySchedule, setWeeklySchedule] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load schedule if editing
  useEffect(() => {
    if (scheduleId) {
      loadSchedule();
    } else {
      // Initialize weekly schedule for new schedule
      initializeWeeklySchedule();
    }
  }, [scheduleId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const schedule = await getSchedule(scheduleId);
      if (schedule) {
        setName(schedule.name || '');
        setDescription(schedule.description || '');
        setScheduleType(schedule.scheduleType || SCHEDULE_TYPES.FIXED);
        setDefaultStartTime(schedule.defaultStartTime || '09:00');
        setDefaultEndTime(schedule.defaultEndTime || '17:00');
        setBreakDuration(schedule.breakDuration || 60);
        setMinHoursPerDay(schedule.minHoursPerDay || 4);
        setMaxHoursPerDay(schedule.maxHoursPerDay || 10);
        setMinHoursPerWeek(schedule.minHoursPerWeek || 20);
        setMaxHoursPerWeek(schedule.maxHoursPerWeek || 50);
        setPreferredWorkDays(schedule.preferredWorkDays || [1, 2, 3, 4, 5]);
        setWeeklySchedule(schedule.weeklySchedule || {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeWeeklySchedule = () => {
    const schedule = {};
    Object.keys(DAYS_OF_WEEK).forEach(day => {
      const dayNum = DAYS_OF_WEEK[day];
      schedule[dayNum] = {
        enabled: [1, 2, 3, 4, 5].includes(dayNum), // Mon-Fri enabled by default
        startTime: '09:00',
        endTime: '17:00'
      };
    });
    setWeeklySchedule(schedule);
  };

  const handleWeeklyScheduleChange = (dayNum, field, value) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        [field]: value
      }
    }));
  };

  const handlePreferredDayToggle = (dayNum) => {
    setPreferredWorkDays(prev => {
      if (prev.includes(dayNum)) {
        return prev.filter(d => d !== dayNum);
      } else {
        return [...prev, dayNum].sort();
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const scheduleData = {
        name,
        description,
        scheduleType,
        defaultStartTime,
        defaultEndTime,
        breakDuration: Number(breakDuration),
        minHoursPerDay: Number(minHoursPerDay),
        maxHoursPerDay: Number(maxHoursPerDay),
        minHoursPerWeek: Number(minHoursPerWeek),
        maxHoursPerWeek: Number(maxHoursPerWeek),
        preferredWorkDays,
        weeklySchedule,
        isActive: false // Will be activated separately
      };

      let savedSchedule;
      if (scheduleId) {
        console.log('Updating schedule:', scheduleId, scheduleData);
        savedSchedule = await updateSchedule(scheduleId, scheduleData);
      } else {
        console.log('Creating schedule:', scheduleData);
        savedSchedule = await createSchedule(scheduleData);
        console.log('Schedule created successfully:', savedSchedule);
      }

      if (onSave) {
        console.log('Calling onSave callback with schedule:', savedSchedule);
        try {
          await onSave(savedSchedule);
          console.log('onSave callback completed');
          // Reset form only if save was successful
          if (!scheduleId) {
            // Reset form for new schedules
            setName('');
            setDescription('');
            setScheduleType(SCHEDULE_TYPES.FIXED);
            setDefaultStartTime('09:00');
            setDefaultEndTime('17:00');
            setBreakDuration(60);
            setMinHoursPerDay(4);
            setMaxHoursPerDay(10);
            setMinHoursPerWeek(20);
            setMaxHoursPerWeek(50);
            setPreferredWorkDays([1, 2, 3, 4, 5]);
            initializeWeeklySchedule();
            console.log('Form reset completed');
          }
        } catch (onSaveError) {
          console.error('Error in onSave callback:', onSaveError);
          // Re-throw to be caught by outer catch
          throw onSaveError;
        }
      } else {
        console.warn('onSave callback is not provided');
      }
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError(err.message || 'Failed to save work schedule');
      // Keep loading false so user can try again
    } finally {
      setLoading(false);
    }
  };

  if (loading && scheduleId) {
    return <div className="p-4 text-dark-text-primary">Loading...</div>;
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/50 text-red-400 rounded">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-dark-text-primary">Basic Information</h3>
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-dark-text-primary mb-1">
            Schedule Name *
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Default Work Schedule"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-dark-text-primary mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of this schedule..."
            rows={3}
            className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="scheduleType" className="block text-sm font-medium text-dark-text-primary mb-1">
            Schedule Type *
          </label>
          <select
            id="scheduleType"
            value={scheduleType}
            onChange={(e) => setScheduleType(e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value={SCHEDULE_TYPES.FIXED}>Fixed Hours (same every day)</option>
            <option value={SCHEDULE_TYPES.FLEXIBLE}>Flexible Hours</option>
            <option value={SCHEDULE_TYPES.SHIFT}>Shift-Based</option>
            <option value={SCHEDULE_TYPES.CUSTOM}>Custom (per day)</option>
          </select>
        </div>
      </div>

      {/* Default Hours (for Fixed and Flexible types) */}
      {(scheduleType === SCHEDULE_TYPES.FIXED || scheduleType === SCHEDULE_TYPES.FLEXIBLE) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-dark-text-primary">Default Work Hours</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="defaultStartTime" className="block text-sm font-medium text-dark-text-primary mb-1">
                Start Time *
              </label>
              <Input
                id="defaultStartTime"
                type="time"
                value={defaultStartTime}
                onChange={(e) => setDefaultStartTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="defaultEndTime" className="block text-sm font-medium text-dark-text-primary mb-1">
                End Time *
              </label>
              <Input
                id="defaultEndTime"
                type="time"
                value={defaultEndTime}
                onChange={(e) => setDefaultEndTime(e.target.value)}
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* Weekly Schedule (for Custom type) */}
      {scheduleType === SCHEDULE_TYPES.CUSTOM && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-dark-text-primary">Weekly Schedule</h3>
          
          <div className="space-y-3">
            {Object.keys(DAYS_OF_WEEK).map(dayName => {
              const dayNum = DAYS_OF_WEEK[dayName];
              const daySchedule = weeklySchedule[dayNum] || { enabled: false, startTime: '09:00', endTime: '17:00' };
              
              return (
                <div key={dayNum} className="flex items-center gap-4 p-3 bg-dark-bg-tertiary rounded-lg">
                  <div className="w-32">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={daySchedule.enabled}
                        onChange={(e) => handleWeeklyScheduleChange(dayNum, 'enabled', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium text-dark-text-primary">
                        {dayNames[dayNum]}
                      </span>
                    </label>
                  </div>
                  
                  {daySchedule.enabled && (
                    <>
                      <Input
                        type="time"
                        value={daySchedule.startTime}
                        onChange={(e) => handleWeeklyScheduleChange(dayNum, 'startTime', e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-dark-text-tertiary">to</span>
                      <Input
                        type="time"
                        value={daySchedule.endTime}
                        onChange={(e) => handleWeeklyScheduleChange(dayNum, 'endTime', e.target.value)}
                        className="flex-1"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Breaks */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-dark-text-primary">Break Configuration</h3>
        
        <div>
          <label htmlFor="breakDuration" className="block text-sm font-medium text-dark-text-primary mb-1">
            Total Break Duration (minutes)
          </label>
          <Input
            id="breakDuration"
            type="number"
            min="0"
            max="480"
            step="15"
            value={breakDuration}
            onChange={(e) => setBreakDuration(e.target.value)}
          />
        </div>
      </div>

      {/* Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-dark-text-primary">Work Preferences</h3>
        
        <div>
          <label className="block text-sm font-medium text-dark-text-primary mb-2">
            Preferred Work Days
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(DAYS_OF_WEEK).map(dayName => {
              const dayNum = DAYS_OF_WEEK[dayName];
              const isPreferred = preferredWorkDays.includes(dayNum);
              
              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handlePreferredDayToggle(dayNum)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isPreferred
                      ? 'bg-blue-500 text-white'
                      : 'bg-dark-bg-tertiary text-dark-text-primary border border-dark-border hover:bg-dark-bg-hover'
                  }`}
                >
                  {dayNames[dayNum].substring(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="minHoursPerDay" className="block text-sm font-medium text-dark-text-primary mb-1">
              Min Hours/Day
            </label>
            <Input
              id="minHoursPerDay"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={minHoursPerDay}
              onChange={(e) => setMinHoursPerDay(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="maxHoursPerDay" className="block text-sm font-medium text-dark-text-primary mb-1">
              Max Hours/Day
            </label>
            <Input
              id="maxHoursPerDay"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={maxHoursPerDay}
              onChange={(e) => setMaxHoursPerDay(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="minHoursPerWeek" className="block text-sm font-medium text-dark-text-primary mb-1">
              Min Hours/Week
            </label>
            <Input
              id="minHoursPerWeek"
              type="number"
              min="0"
              max="168"
              step="1"
              value={minHoursPerWeek}
              onChange={(e) => setMinHoursPerWeek(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="maxHoursPerWeek" className="block text-sm font-medium text-dark-text-primary mb-1">
              Max Hours/Week
            </label>
            <Input
              id="maxHoursPerWeek"
              type="number"
              min="0"
              max="168"
              step="1"
              value={maxHoursPerWeek}
              onChange={(e) => setMaxHoursPerWeek(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-4 border-t border-dark-border">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : scheduleId ? 'Update Schedule' : 'Create Schedule'}
        </Button>
      </div>
    </form>
  );
}

