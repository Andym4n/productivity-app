import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../src/components/Button';

describe('Button', () => {
  it('renders button with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick} disabled>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
  
  it('applies correct variant classes', () => {
    const { rerender } = render(<Button variant="primary">Button</Button>);
    let button = screen.getByRole('button');
    expect(button.className).toContain('bg-blue-600');
    
    rerender(<Button variant="secondary">Button</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('bg-dark-bg-secondary');
    
    rerender(<Button variant="danger">Button</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('bg-red-600');
  });
  
  it('applies correct size classes', () => {
    const { rerender } = render(<Button size="sm">Button</Button>);
    let button = screen.getByRole('button');
    expect(button.className).toContain('px-3');
    
    rerender(<Button size="md">Button</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('px-4');
    
    rerender(<Button size="lg">Button</Button>);
    button = screen.getByRole('button');
    expect(button.className).toContain('px-6');
  });
  
  it('has aria-disabled when disabled', () => {
    render(<Button disabled>Button</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });
  
  it('supports aria-label', () => {
    render(<Button aria-label="Close dialog">×</Button>);
    expect(screen.getByRole('button', { name: /close dialog/i })).toBeInTheDocument();
  });
  
  it('has correct type attribute', () => {
    const { rerender } = render(<Button type="button">Button</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    
    rerender(<Button type="submit">Button</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});

