import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button } from '../Button';

/**
 * Modal component with accessibility and dark theme support
 * 
 * Features:
 * - Focus trap for keyboard navigation
 * - ESC key to close
 * - ARIA attributes for screen readers
 * - Backdrop click to close (optional)
 * - Focus restoration on close
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeOnBackdropClick = true,
  size = 'md',
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  className = '',
}) => {
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  
  // Focus trap and ESC key handling
  useEffect(() => {
    if (!isOpen) return;
    
    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement;
    
    // Focus the modal when it opens
    const modal = modalRef.current;
    if (modal) {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0];
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
    
    // Handle ESC key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    // Handle focus trap
    const handleTab = (e) => {
      if (!modal) return;
      
      const focusableElements = Array.from(
        modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
      
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
      document.body.style.overflow = '';
      
      // Restore focus to previous element
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);
  
  const handleBackdropClick = (e) => {
    if (!closeOnBackdropClick) return;
    // Close if clicking on the backdrop overlay (not the modal content)
    // Check if the click target is the backdrop div or the outer container
    const isBackdrop = e.target.classList.contains('backdrop-blur-sm') || 
                       e.target === e.currentTarget;
    if (isBackdrop) {
      onClose();
    }
  };
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };
  
  if (!isOpen) return null;
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div
        ref={modalRef}
        className={`
          relative bg-dark-bg-secondary rounded-[12px] border border-dark-border
          flex flex-col
          max-h-[90vh]
          ${sizeClasses[size]}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        style={{ 
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-dark-border flex-shrink-0">
            <h2
              id={ariaLabelledBy}
              className="text-xl font-semibold text-dark-text-primary"
            >
              {title}
            </h2>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close modal"
                className="ml-4"
              >
                ✕
              </Button>
            )}
          </div>
        )}
        
        {/* Body - Scrollable */}
        <div className="p-6 text-dark-text-primary overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  showCloseButton: PropTypes.bool,
  closeOnBackdropClick: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'full']),
  'aria-labelledby': PropTypes.string,
  'aria-describedby': PropTypes.string,
  className: PropTypes.string,
};

export default Modal;

