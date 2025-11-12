import React, { useState, Suspense, lazy, useEffect } from 'react';
import { Button, Input, Modal } from './components';
import JournalPage from './pages/JournalPage.jsx';
import SchedulePage from './pages/SchedulePage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import { setNavigationHandler } from './utils/navigation.js';

// Lazy load DashboardPage to prevent blocking if there are import errors
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));

/**
 * Main Application Component
 * Demonstrates the UI component library with dark theme support
 */
function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'dashboard', 'journal', 'schedule', or 'calendar'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  
  // Set up navigation handler for widgets
  useEffect(() => {
    setNavigationHandler((page, options) => {
      setCurrentPage(page);
      // Handle special options like opening new entry form
      if (options?.newEntry && page === 'journal') {
        // Store flag in sessionStorage for JournalPage to check
        sessionStorage.setItem('journalNewEntry', 'true');
      }
    });
  }, []);
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    // Simple validation example
    if (value.length > 0 && value.length < 3) {
      setInputError('Input must be at least 3 characters');
    } else {
      setInputError('');
    }
  };
  
  // Simple navigation - show journal page, schedule page, calendar page, dashboard, or home
  if (currentPage === 'dashboard') {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-dark-bg-primary text-dark-text-primary flex items-center justify-center">
          <div className="text-dark-text-tertiary">Loading dashboard...</div>
        </div>
      }>
        <DashboardPage />
      </Suspense>
    );
  }

  if (currentPage === 'journal') {
    return <JournalPage />;
  }

  if (currentPage === 'schedule') {
    return <SchedulePage />;
  }

  if (currentPage === 'calendar') {
    return <CalendarPage />;
  }

  return (
    <div className="min-h-screen bg-dark-bg-primary text-dark-text-primary">
      <div className="max-w-[1200px] mx-auto px-10 py-[60px]">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="section-heading mb-2">Productivity App</h1>
              <p className="section-subtext">
                A unified productivity hub for tasks, calendar, journal, and exercise tracking
              </p>
            </div>
            <nav className="flex gap-4">
              <Button
                variant={currentPage === 'home' ? 'primary' : 'ghost'}
                onClick={() => setCurrentPage('home')}
              >
                Home
              </Button>
              <Button
                variant={currentPage === 'dashboard' ? 'primary' : 'ghost'}
                onClick={() => setCurrentPage('dashboard')}
              >
                Dashboard
              </Button>
              <Button
                variant={currentPage === 'journal' ? 'primary' : 'ghost'}
                onClick={() => setCurrentPage('journal')}
              >
                Journal
              </Button>
              <Button
                variant={currentPage === 'schedule' ? 'primary' : 'ghost'}
                onClick={() => setCurrentPage('schedule')}
              >
                Schedule
              </Button>
              <Button
                variant={currentPage === 'calendar' ? 'primary' : 'ghost'}
                onClick={() => setCurrentPage('calendar')}
              >
                Calendar
              </Button>
            </nav>
          </div>
        </header>
        
        {/* Component Showcase Section */}
        <section className="mb-8">
          <div className="mb-6">
            <p className="section-label mb-2">COMPONENTS</p>
            <h2 className="section-heading mb-2">UI Component Library</h2>
          </div>
          
          <div className="card-glow mb-6">
            <h3 className="text-xl font-medium mb-4">Buttons</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="danger">Danger Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="primary" disabled>Disabled Button</Button>
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="lg">Large</Button>
            </div>
          </div>
          
          <div className="card-glow mb-6">
            <h3 className="text-xl font-medium mb-4">Inputs</h3>
            <div className="space-y-4 max-w-md">
              <Input
                label="Default Input"
                placeholder="Enter text here"
                value={inputValue}
                onChange={handleInputChange}
                helperText="This is a helper text"
              />
              <Input
                label="Required Input"
                placeholder="This field is required"
                required
                helperText="This field is required"
              />
              <Input
                label="Input with Error"
                value={inputValue}
                onChange={handleInputChange}
                error={inputError}
                placeholder="Type less than 3 characters to see error"
              />
              <Input
                label="Disabled Input"
                value="Disabled value"
                onChange={() => {}}
                disabled
                helperText="This input is disabled"
              />
            </div>
          </div>
          
          <div className="card-glow">
            <h3 className="text-xl font-medium mb-4">Modal</h3>
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
            >
              Open Modal
            </Button>
            
            <Modal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              title="Example Modal"
              size="md"
            >
              <p className="mb-4">
                This is a modal component with full accessibility support.
                Press ESC to close, or click the backdrop.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Confirm
                </Button>
              </div>
            </Modal>
          </div>
        </section>
        
        {/* Status Section */}
        <section className="card-glow mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Storage:</span>{' '}
              <span className="text-green-400">✓ IndexedDB initialized</span>
            </p>
            <p className="text-sm">
              <span className="font-medium">UI Library:</span>{' '}
              <span className="text-green-400">✓ React components ready</span>
            </p>
            <p className="text-sm">
              <span className="font-medium">Theme:</span>{' '}
              <span className="text-accent-purple">✓ Leet-inspired dark theme enabled</span>
            </p>
            <p className="text-sm">
              <span className="font-medium">Accessibility:</span>{' '}
              <span className="text-green-400">✓ ARIA attributes and keyboard navigation</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;

