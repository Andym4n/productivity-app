/**
 * Project Time Reporting Utilities
 * 
 * Functions for aggregating and reporting time allocation by project
 */

import { parseISO, differenceInMinutes, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { getTimeBlocks } from '../crud/index.js';

/**
 * Calculate total time allocated to a project
 * @param {Array<Object>} timeBlocks - Array of time blocks
 * @param {string} projectId - Project ID
 * @returns {number} Total minutes allocated
 */
export function calculateProjectTime(timeBlocks, projectId) {
  return timeBlocks
    .filter(block => block.projectId === projectId)
    .reduce((total, block) => {
      // Use actual duration if completed, otherwise use scheduled duration
      const duration = block.actualDuration || block.duration || 0;
      return total + duration;
    }, 0);
}

/**
 * Get project time summary
 * @param {Array<Object>} timeBlocks - Array of time blocks
 * @returns {Object} Project time summary { projectId: { projectName, totalMinutes, blockCount, blocks } }
 */
export function getProjectTimeSummary(timeBlocks) {
  const summary = {};
  
  timeBlocks.forEach(block => {
    const projectId = block.projectId || 'unassigned';
    const projectName = block.projectName || 'Unassigned';
    
    if (!summary[projectId]) {
      summary[projectId] = {
        projectId,
        projectName,
        totalMinutes: 0,
        scheduledMinutes: 0,
        actualMinutes: 0,
        blockCount: 0,
        completedBlocks: 0,
        blocks: []
      };
    }
    
    const duration = block.duration || 0;
    const actualDuration = block.actualDuration || 0;
    
    summary[projectId].totalMinutes += duration;
    summary[projectId].scheduledMinutes += duration;
    summary[projectId].actualMinutes += actualDuration;
    summary[projectId].blockCount += 1;
    
    if (block.status === 'completed') {
      summary[projectId].completedBlocks += 1;
    }
    
    summary[projectId].blocks.push(block);
  });
  
  return summary;
}

/**
 * Generate project time report for a date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Promise<Object>} Project time report
 */
export async function generateProjectReport(startDate, endDate) {
  try {
    // Get all time blocks in the date range
    const blocks = await getTimeBlocks({ startDate, endDate });
    
    // Get project summary
    const summary = getProjectTimeSummary(blocks);
    
    // Calculate totals
    const totalScheduledMinutes = blocks.reduce((total, block) => total + (block.duration || 0), 0);
    const totalActualMinutes = blocks.reduce((total, block) => total + (block.actualDuration || 0), 0);
    const totalBlocks = blocks.length;
    const completedBlocks = blocks.filter(b => b.status === 'completed').length;
    
    // Calculate project percentages
    const projectSummary = Object.values(summary).map(project => ({
      ...project,
      scheduledHours: Math.round((project.scheduledMinutes / 60) * 100) / 100,
      actualHours: Math.round((project.actualMinutes / 60) * 100) / 100,
      percentageOfTotal: totalScheduledMinutes > 0 
        ? Math.round((project.scheduledMinutes / totalScheduledMinutes) * 100)
        : 0,
      completionRate: project.blockCount > 0
        ? Math.round((project.completedBlocks / project.blockCount) * 100)
        : 0
    }));
    
    // Sort by total time descending
    projectSummary.sort((a, b) => b.scheduledMinutes - a.scheduledMinutes);
    
    return {
      startDate: typeof startDate === 'string' ? startDate : startDate.toISOString(),
      endDate: typeof endDate === 'string' ? endDate : endDate.toISOString(),
      totalScheduledMinutes,
      totalActualMinutes,
      totalScheduledHours: Math.round((totalScheduledMinutes / 60) * 100) / 100,
      totalActualHours: Math.round((totalActualMinutes / 60) * 100) / 100,
      totalBlocks,
      completedBlocks,
      completionRate: totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0,
      projects: projectSummary,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to generate project report: ${error.message}`);
  }
}

/**
 * Generate weekly project report
 * @param {Date|string} date - Any date within the week
 * @returns {Promise<Object>} Weekly project report
 */
export async function generateWeeklyProjectReport(date) {
  const targetDate = typeof date === 'string' ? parseISO(date) : date;
  const start = startOfWeek(targetDate);
  const end = endOfWeek(targetDate);
  
  const report = await generateProjectReport(start, end);
  
  return {
    ...report,
    reportType: 'weekly',
    weekStart: format(start, 'yyyy-MM-dd'),
    weekEnd: format(end, 'yyyy-MM-dd')
  };
}

/**
 * Generate monthly project report
 * @param {Date|string} date - Any date within the month
 * @returns {Promise<Object>} Monthly project report
 */
export async function generateMonthlyProjectReport(date) {
  const targetDate = typeof date === 'string' ? parseISO(date) : date;
  const start = startOfMonth(targetDate);
  const end = endOfMonth(targetDate);
  
  const report = await generateProjectReport(start, end);
  
  return {
    ...report,
    reportType: 'monthly',
    monthStart: format(start, 'yyyy-MM-dd'),
    monthEnd: format(end, 'yyyy-MM-dd'),
    month: format(targetDate, 'MMMM yyyy')
  };
}

/**
 * Get time allocation by project for a specific period
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {string} groupBy - Grouping: 'day', 'week', 'month'
 * @returns {Promise<Array>} Time allocation data grouped by period
 */
export async function getProjectTimeAllocation(startDate, endDate, groupBy = 'day') {
  try {
    const blocks = await getTimeBlocks({ startDate, endDate });
    
    // Group blocks by period
    const grouped = {};
    
    blocks.forEach(block => {
      const blockDate = parseISO(block.startTime);
      let periodKey;
      
      switch (groupBy) {
        case 'week':
          periodKey = format(startOfWeek(blockDate), 'yyyy-MM-dd');
          break;
        case 'month':
          periodKey = format(startOfMonth(blockDate), 'yyyy-MM-dd');
          break;
        default: // day
          periodKey = format(blockDate, 'yyyy-MM-dd');
      }
      
      if (!grouped[periodKey]) {
        grouped[periodKey] = [];
      }
      
      grouped[periodKey].push(block);
    });
    
    // Calculate summary for each period
    const allocation = Object.entries(grouped).map(([period, periodBlocks]) => {
      const projectSummary = getProjectTimeSummary(periodBlocks);
      
      return {
        period,
        totalMinutes: periodBlocks.reduce((sum, b) => sum + (b.duration || 0), 0),
        totalHours: Math.round((periodBlocks.reduce((sum, b) => sum + (b.duration || 0), 0) / 60) * 100) / 100,
        blockCount: periodBlocks.length,
        projects: Object.values(projectSummary).map(p => ({
          projectId: p.projectId,
          projectName: p.projectName,
          minutes: p.scheduledMinutes,
          hours: Math.round((p.scheduledMinutes / 60) * 100) / 100,
          blockCount: p.blockCount
        }))
      };
    });
    
    // Sort by period
    allocation.sort((a, b) => a.period.localeCompare(b.period));
    
    return allocation;
  } catch (error) {
    throw new Error(`Failed to get project time allocation: ${error.message}`);
  }
}

/**
 * Export project report as CSV
 * @param {Object} report - Project report object
 * @returns {string} CSV string
 */
export function exportProjectReportToCSV(report) {
  const lines = [];
  
  // Header
  lines.push('Project Report');
  lines.push(`Period: ${format(parseISO(report.startDate), 'MMM d, yyyy')} - ${format(parseISO(report.endDate), 'MMM d, yyyy')}`);
  lines.push(`Generated: ${format(parseISO(report.generatedAt), 'MMM d, yyyy HH:mm')}`);
  lines.push('');
  
  // Summary
  lines.push(`Total Scheduled Hours,${report.totalScheduledHours}`);
  lines.push(`Total Actual Hours,${report.totalActualHours}`);
  lines.push(`Total Blocks,${report.totalBlocks}`);
  lines.push(`Completed Blocks,${report.completedBlocks}`);
  lines.push(`Completion Rate,${report.completionRate}%`);
  lines.push('');
  
  // Project details header
  lines.push('Project Name,Project ID,Scheduled Hours,Actual Hours,Blocks,Completed,Completion Rate,%');
  
  // Project details
  report.projects.forEach(project => {
    lines.push([
      `"${project.projectName}"`,
      project.projectId,
      project.scheduledHours,
      project.actualHours,
      project.blockCount,
      project.completedBlocks,
      project.completionRate,
      project.percentageOfTotal
    ].join(','));
  });
  
  return lines.join('\n');
}

export default {
  calculateProjectTime,
  getProjectTimeSummary,
  generateProjectReport,
  generateWeeklyProjectReport,
  generateMonthlyProjectReport,
  getProjectTimeAllocation,
  exportProjectReportToCSV
};

