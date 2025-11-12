import React from 'react';
import PropTypes from 'prop-types';

/**
 * Button component with accessibility and dark theme support
 * 
 * Features:
 * - Full keyboard navigation support
 * - ARIA attributes for screen readers
 * - Multiple variants and sizes
 * - Disabled state handling
 * - Focus management
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  'aria-label': ariaLabel,
  ...props
}) => {
  const baseClasses = 'btn-base';
  
  const variantClasses = {
    primary: 'bg-button-gradient text-white hover:shadow-button-hover active:opacity-90',
    secondary: 'bg-dark-bg-secondary text-dark-text-primary border border-dark-border hover:border-accent-purple/30 hover:shadow-purple-glow',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    ghost: 'text-dark-text-primary hover:bg-dark-bg-secondary hover:text-accent-purple',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-3 text-base', // 12px vertical, 20px horizontal per Leet spec
    lg: 'px-6 py-4 text-lg',
  };
  
  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  onClick: PropTypes.func,
  className: PropTypes.string,
  'aria-label': PropTypes.string,
};

export default Button;

