/**
 * Project Report View Component
 * 
 * Displays project-based time allocation reports
 */

import { useState, useEffect } from 'react';
import { Button } from '../index.js';
import { 
  generateProjectReport,
  generateWeeklyProjectReport,
  generateMonthlyProjectReport,
  exportProjectReportToCSV
} from '../../schedule/utils/index.js';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

/**
 * ProjectReportView component
 * @param {Object} props
 * @param {Date|string|null} props.defaultStartDate - Default start date
 * @param {Date|string|null} props.defaultEndDate - Default end date
 */
export default function ProjectReportView({ defaultStartDate = null, defaultEndDate = null }) {
  const [reportType, setReportType] = useState('week'); // week, month, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize dates based on report type
    const now = new Date();
    
    if (reportType === 'week') {
      setStartDate(format(startOfWeek(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfWeek(now), 'yyyy-MM-dd'));
    } else if (reportType === 'month') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (defaultStartDate && defaultEndDate) {
      setStartDate(typeof defaultStartDate === 'string' ? defaultStartDate : format(defaultStartDate, 'yyyy-MM-dd'));
      setEndDate(typeof defaultEndDate === 'string' ? defaultEndDate : format(defaultEndDate, 'yyyy-MM-dd'));
    }
  }, [reportType, defaultStartDate, defaultEndDate]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let reportData;
      
      if (reportType === 'week') {
        reportData = await generateWeeklyProjectReport(new Date(startDate));
      } else if (reportType === 'month') {
        reportData = await generateMonthlyProjectReport(new Date(startDate));
      } else {
        reportData = await generateProjectReport(new Date(startDate), new Date(endDate));
      }
      
      setReport(reportData);
    } catch (err) {
      setError(err.message || 'Failed to generate report');
      console.error('Error generating report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!report) return;
    
    const csv = exportProjectReportToCSV(report);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (startDate && endDate) {
      loadReport();
    }
  }, [startDate, endDate, reportType]);

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <div className="bg-dark-bg-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Report Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-text-primary mb-2">
              Report Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReportType('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  reportType === 'week'
                    ? 'bg-blue-500 text-white'
                    : 'bg-dark-bg-tertiary text-dark-text-primary border border-dark-border hover:bg-dark-bg-hover'
                }`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setReportType('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  reportType === 'month'
                    ? 'bg-blue-500 text-white'
                    : 'bg-dark-bg-tertiary text-dark-text-primary border border-dark-border hover:bg-dark-bg-hover'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setReportType('custom')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  reportType === 'custom'
                    ? 'bg-blue-500 text-white'
                    : 'bg-dark-bg-tertiary text-dark-text-primary border border-dark-border hover:bg-dark-bg-hover'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {reportType === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-dark-text-primary mb-1">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-dark-text-primary mb-1">
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={loadReport}
              disabled={loading || !startDate || !endDate}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            {report && (
              <Button
                variant="secondary"
                onClick={handleExportCSV}
              >
                Export CSV
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Report Display */}
      {loading && (
        <div className="text-center py-12 text-dark-text-tertiary">
          Generating report...
        </div>
      )}

      {!loading && report && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-dark-bg-secondary rounded-lg p-6">
            <h3 className="text-xl font-bold text-dark-text-primary mb-4">
              Summary
              {report.reportType && (
                <span className="ml-2 text-sm font-normal text-dark-text-tertiary">
                  ({report.reportType === 'weekly' ? 'Weekly' : report.reportType === 'monthly' ? 'Monthly' : 'Custom'})
                </span>
              )}
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-bg-tertiary rounded-lg p-4">
                <div className="text-sm text-dark-text-tertiary mb-1">Scheduled Hours</div>
                <div className="text-2xl font-bold text-dark-text-primary">
                  {report.totalScheduledHours}h
                </div>
              </div>
              
              <div className="bg-dark-bg-tertiary rounded-lg p-4">
                <div className="text-sm text-dark-text-tertiary mb-1">Actual Hours</div>
                <div className="text-2xl font-bold text-dark-text-primary">
                  {report.totalActualHours}h
                </div>
              </div>
              
              <div className="bg-dark-bg-tertiary rounded-lg p-4">
                <div className="text-sm text-dark-text-tertiary mb-1">Total Blocks</div>
                <div className="text-2xl font-bold text-dark-text-primary">
                  {report.totalBlocks}
                </div>
              </div>
              
              <div className="bg-dark-bg-tertiary rounded-lg p-4">
                <div className="text-sm text-dark-text-tertiary mb-1">Completion Rate</div>
                <div className="text-2xl font-bold text-dark-text-primary">
                  {report.completionRate}%
                </div>
              </div>
            </div>
          </div>

          {/* Project Breakdown */}
          <div className="bg-dark-bg-secondary rounded-lg p-6">
            <h3 className="text-xl font-bold text-dark-text-primary mb-4">
              Project Breakdown
            </h3>
            
            {report.projects.length === 0 ? (
              <p className="text-dark-text-tertiary text-center py-8">
                No time blocks found for this period
              </p>
            ) : (
              <div className="space-y-3">
                {report.projects.map((project, idx) => (
                  <div
                    key={project.projectId}
                    className="bg-dark-bg-tertiary rounded-lg p-4 hover:bg-dark-bg-hover transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-dark-text-primary">
                          {project.projectName}
                        </h4>
                        <p className="text-sm text-dark-text-tertiary">
                          {project.projectId}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-400">
                          {project.scheduledHours}h
                        </div>
                        <div className="text-sm text-dark-text-tertiary">
                          {project.percentageOfTotal}% of total
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-dark-border">
                      <div>
                        <div className="text-xs text-dark-text-tertiary">Blocks</div>
                        <div className="text-sm font-medium text-dark-text-primary">
                          {project.blockCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-dark-text-tertiary">Actual Hours</div>
                        <div className="text-sm font-medium text-dark-text-primary">
                          {project.actualHours}h
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-dark-text-tertiary">Completion</div>
                        <div className="text-sm font-medium text-dark-text-primary">
                          {project.completionRate}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="h-2 bg-dark-bg-primary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${project.percentageOfTotal}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

