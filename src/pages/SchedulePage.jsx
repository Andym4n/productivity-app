/**
 * Schedule Page Component
 * 
 * Main page for work schedule management, integrating schedule configuration,
 * time block management, and project reporting.
 */

import { useState, useEffect } from 'react';
import { Button, Modal } from '../components';
import ScheduleConfigForm from '../components/ScheduleConfigForm/ScheduleConfigForm.jsx';
import TimeBlockForm from '../components/TimeBlockForm/TimeBlockForm.jsx';
import ProjectReportView from '../components/ProjectReportView/ProjectReportView.jsx';
import {
  getCurrentSchedule,
  getAllSchedules,
  activateSchedule,
  getTimeBlocks,
  deleteTimeBlock,
  startTimeBlock,
  completeTimeBlock
} from '../schedule/index.js';
import { format, parseISO, startOfWeek, endOfWeek, addDays } from 'date-fns';

/**
 * SchedulePage component
 * Main page for managing work schedules and time blocks
 */
export default function SchedulePage() {
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [allSchedules, setAllSchedules] = useState([]);
  const [timeBlocks, setTimeBlocks] = useState([]);
  const [filteredBlocks, setFilteredBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('week'); // week, day, list
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTimeBlocks();
  }, [selectedDate, view]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('loadData: Fetching schedules...');
      const [schedule, schedules] = await Promise.all([
        getCurrentSchedule(),
        getAllSchedules()
      ]);
      console.log('loadData: Current schedule:', schedule);
      console.log('loadData: All schedules count:', schedules.length);
      console.log('loadData: Active schedules:', schedules.filter(s => s.isActive));
      setCurrentSchedule(schedule);
      setAllSchedules(schedules);
      console.log('loadData: State updated');
    } catch (err) {
      setError(err.message || 'Failed to load schedule data');
      console.error('Error loading schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeBlocks = async () => {
    try {
      let blocks;
      
      if (view === 'week') {
        const start = startOfWeek(selectedDate);
        const end = endOfWeek(selectedDate);
        blocks = await getTimeBlocks({ startDate: start, endDate: end });
      } else if (view === 'day') {
        blocks = await getTimeBlocks({ date: selectedDate });
      } else {
        // List view - get all blocks
        blocks = await getTimeBlocks({});
      }
      
      setTimeBlocks(blocks);
      setFilteredBlocks(blocks);
    } catch (err) {
      console.error('Error loading time blocks:', err);
    }
  };

  const handleScheduleSave = async (schedule) => {
    console.log('handleScheduleSave called with schedule:', schedule);
    try {
      if (!schedule || !schedule.id) {
        throw new Error('Invalid schedule data received');
      }
      
      console.log('Reloading data...');
      // Reload data first to get updated schedule list
      await loadData();
      console.log('Data reloaded, currentSchedule:', currentSchedule);
      
      // Check if there's still no active schedule after reload
      // If so, activate the newly created schedule (first schedule case)
      console.log('Checking for active schedule...');
      const [updatedCurrentSchedule, updatedSchedules] = await Promise.all([
        getCurrentSchedule(),
        getAllSchedules()
      ]);
      
      console.log('Updated current schedule:', updatedCurrentSchedule);
      console.log('All schedules:', updatedSchedules);
      
      if (schedule && !updatedCurrentSchedule) {
        console.log('No active schedule found, activating newly created schedule...');
        // No active schedule exists, activate the newly created one
        const justCreated = updatedSchedules.find(s => s.id === schedule.id);
        console.log('Found created schedule:', justCreated);
        if (justCreated && !justCreated.isActive) {
          console.log('Activating schedule:', schedule.id);
          await activateSchedule(schedule.id);
          console.log('Schedule activated, reloading data...');
          await loadData(); // Reload again to show the activated schedule
          
          // Verify the schedule is now active
          const finalCheck = await getCurrentSchedule();
          console.log('Final check - current schedule:', finalCheck);
          if (!finalCheck) {
            console.error('WARNING: Schedule was activated but getCurrentSchedule returned null');
            setError('Schedule was created but could not be activated. Please try activating it manually.');
            return; // Don't close modal if activation failed
          }
          console.log('Final reload completed, schedule is now active');
        } else {
          console.log('Schedule already active or not found');
        }
      } else {
        console.log('Active schedule already exists, skipping activation');
      }
      
      console.log('Closing schedule form modal');
      setShowScheduleForm(false);
      console.log('handleScheduleSave completed successfully');
    } catch (err) {
      console.error('Error in handleScheduleSave:', err);
      setError(err.message || 'Failed to save schedule');
      // Don't close the modal if there's an error
    }
  };

  const handleScheduleActivate = async (scheduleId) => {
    try {
      await activateSchedule(scheduleId);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBlockSave = async (block) => {
    await loadTimeBlocks();
    setShowBlockForm(false);
    setSelectedBlockId(null);
  };

  const handleBlockEdit = (blockId) => {
    setSelectedBlockId(blockId);
    setShowBlockForm(true);
  };

  const handleBlockDelete = async (blockId) => {
    if (!window.confirm('Are you sure you want to delete this time block?')) {
      return;
    }

    try {
      await deleteTimeBlock(blockId);
      await loadTimeBlocks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBlockStart = async (blockId) => {
    try {
      await startTimeBlock(blockId);
      await loadTimeBlocks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBlockComplete = async (blockId) => {
    try {
      await completeTimeBlock(blockId);
      await loadTimeBlocks();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600/20 text-green-400 border-green-500/50';
      case 'in-progress':
        return 'bg-blue-600/20 text-blue-400 border-blue-500/50';
      case 'cancelled':
        return 'bg-red-600/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-500/50';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'work':
        return 'bg-blue-500';
      case 'meeting':
        return 'bg-purple-500';
      case 'break':
        return 'bg-green-500';
      case 'focus':
        return 'bg-orange-500';
      case 'admin':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg-primary text-dark-text-primary flex items-center justify-center">
        <div className="text-dark-text-tertiary">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg-primary text-dark-text-primary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Work Schedule</h1>
              <p className="text-dark-text-tertiary">
                Manage your work hours, time blocks, and project allocation
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowReports(!showReports)}
              >
                {showReports ? 'Hide Reports' : 'View Reports'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowScheduleForm(true)}
              >
                {currentSchedule ? 'Edit Schedule' : 'Create Schedule'}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedBlockId(null);
                  setShowBlockForm(true);
                }}
              >
                + New Time Block
              </Button>
            </div>
          </div>

          {/* Current Schedule Info */}
          {currentSchedule && (
            <div className="bg-dark-bg-secondary rounded-lg p-4 border border-dark-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-dark-text-primary">
                    {currentSchedule.name}
                  </h3>
                  <p className="text-sm text-dark-text-tertiary">
                    {currentSchedule.description || 'No description'}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm text-dark-text-tertiary">
                    <span>Type: {currentSchedule.scheduleType}</span>
                    <span>Hours: {currentSchedule.defaultStartTime} - {currentSchedule.defaultEndTime}</span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm">
                  Active
                </span>
              </div>
            </div>
          )}

          {!currentSchedule && (
            <div className="bg-dark-bg-secondary rounded-lg p-6 text-center border border-dark-border">
              <p className="text-dark-text-tertiary mb-4">
                No active work schedule configured
              </p>
              <Button
                variant="primary"
                onClick={() => setShowScheduleForm(true)}
              >
                Create Your First Schedule
              </Button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Reports View */}
        {showReports && (
          <div className="mb-8">
            <ProjectReportView />
          </div>
        )}

        {/* View Controls */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setView('day')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'day'
                  ? 'bg-blue-500 text-white'
                  : 'bg-dark-bg-tertiary text-dark-text-primary border border-dark-border hover:bg-dark-bg-hover'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'week'
                  ? 'bg-blue-500 text-white'
                  : 'bg-dark-bg-tertiary text-dark-text-primary border border-dark-border hover:bg-dark-bg-hover'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-dark-bg-tertiary text-dark-text-primary border border-dark-border hover:bg-dark-bg-hover'
              }`}
            >
              List
            </button>
          </div>

          {/* Date Navigation */}
          {view !== 'list' && (
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, view === 'week' ? -7 : -1))}
              >
                ← Previous
              </Button>
              <span className="text-dark-text-primary font-medium min-w-[200px] text-center">
                {view === 'week' 
                  ? `${format(startOfWeek(selectedDate), 'MMM d')} - ${format(endOfWeek(selectedDate), 'MMM d, yyyy')}`
                  : format(selectedDate, 'EEEE, MMMM d, yyyy')
                }
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, view === 'week' ? 7 : 1))}
              >
                Next →
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
            </div>
          )}
        </div>

        {/* Time Blocks Display */}
        {filteredBlocks.length === 0 ? (
          <div className="text-center py-12 bg-dark-bg-secondary rounded-lg">
            <p className="text-dark-text-tertiary mb-4">
              No time blocks scheduled for this period
            </p>
            <Button
              variant="primary"
              onClick={() => {
                setSelectedBlockId(null);
                setShowBlockForm(true);
              }}
            >
              Create First Time Block
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBlocks.map((block) => (
              <div
                key={block.id}
                className="bg-dark-bg-secondary rounded-lg p-4 hover:bg-dark-bg-hover transition-colors border-l-4"
                style={{ borderLeftColor: block.color || '#3b82f6' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-3 h-3 rounded-full ${getTypeColor(block.type)}`} />
                      <h3 className="text-lg font-semibold text-dark-text-primary">
                        {block.title}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(block.status)}`}>
                        {block.status}
                      </span>
                    </div>
                    
                    <div className="flex gap-4 text-sm text-dark-text-tertiary mb-2">
                      <span>⏰ {format(parseISO(block.startTime), 'MMM d, HH:mm')} - {format(parseISO(block.endTime), 'HH:mm')}</span>
                      <span>⏱️ {Math.round(block.duration / 60 * 10) / 10}h</span>
                      {block.projectName && (
                        <span>📁 {block.projectName}</span>
                      )}
                    </div>
                    
                    {block.description && (
                      <p className="text-sm text-dark-text-secondary mb-2">
                        {block.description}
                      </p>
                    )}
                    
                    {block.tags && block.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {block.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    {block.status === 'scheduled' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleBlockStart(block.id)}
                      >
                        Start
                      </Button>
                    )}
                    {block.status === 'in-progress' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleBlockComplete(block.id)}
                      >
                        Complete
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleBlockEdit(block.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleBlockDelete(block.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Schedule Form Modal */}
        {showScheduleForm && (
          <Modal
            isOpen={showScheduleForm}
            onClose={() => setShowScheduleForm(false)}
            title={currentSchedule ? 'Edit Work Schedule' : 'Create Work Schedule'}
          >
            <ScheduleConfigForm
              scheduleId={currentSchedule?.id || null}
              onSave={handleScheduleSave}
              onCancel={() => setShowScheduleForm(false)}
            />
          </Modal>
        )}

        {/* Time Block Form Modal */}
        {showBlockForm && (
          <Modal
            isOpen={showBlockForm}
            onClose={() => {
              setShowBlockForm(false);
              setSelectedBlockId(null);
            }}
            title={selectedBlockId ? 'Edit Time Block' : 'Create Time Block'}
          >
            <TimeBlockForm
              blockId={selectedBlockId}
              defaultDate={selectedDate}
              onSave={handleBlockSave}
              onCancel={() => {
                setShowBlockForm(false);
                setSelectedBlockId(null);
              }}
            />
          </Modal>
        )}
      </div>
    </div>
  );
}

