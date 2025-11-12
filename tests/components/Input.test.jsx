import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../../src/components/Input';

describe('Input', () => {
  it('renders input with label', () => {
    render(<Input label="Test Input" value="" onChange={() => {}} />);
    expect(screen.getByLabelText(/test input/i)).toBeInTheDocument();
  });
  
  it('associates label with input via id', () => {
    render(<Input label="Test Input" value="" onChange={() => {}} />);
    const input = screen.getByLabelText(/test input/i);
    const label = screen.getByText(/test input/i);
    expect(label).toHaveAttribute('for', input.id);
  });
  
  it('calls onChange when value changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Input value="" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'test');
    expect(handleChange).toHaveBeenCalled();
  });
  
  it('displays error message when error prop is provided', () => {
    render(
      <Input
        value=""
        onChange={() => {}}
        error="This field is required"
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
  
  it('displays helper text when provided and no error', () => {
    render(
      <Input
        value=""
        onChange={() => {}}
        helperText="Enter your email address"
      />
    );
    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
  });
  
  it('does not display helper text when error is present', () => {
    render(
      <Input
        value=""
        onChange={() => {}}
        error="Error message"
        helperText="Helper text"
      />
    );
    expect(screen.queryByText(/helper text/i)).not.toBeInTheDocument();
    expect(screen.getByText(/error message/i)).toBeInTheDocument();
  });
  
  it('shows required indicator when required', () => {
    render(<Input label="Required Field" value="" onChange={() => {}} required />);
    const label = screen.getByText(/required field/i);
    expect(label).toHaveTextContent('*');
  });
  
  it('has aria-required when required', () => {
    render(<Input value="" onChange={() => {}} required />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
  });
  
  it('is disabled when disabled prop is true', () => {
    render(<Input value="test" onChange={() => {}} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
  
  it('supports different input types', () => {
    const { rerender } = render(<Input type="text" value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    
    rerender(<Input type="email" value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    
    rerender(<Input type="password" value="" onChange={() => {}} />);
    // Password inputs don't have textbox role, use getByDisplayValue or querySelector
    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
  
  it('has aria-describedby when error or helperText is present', () => {
    const { rerender } = render(
      <Input value="" onChange={() => {}} error="Error" />
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby');
    expect(input.getAttribute('aria-describedby')).toContain('error');
    
    rerender(<Input value="" onChange={() => {}} helperText="Helper" />);
    expect(input.getAttribute('aria-describedby')).toContain('helper');
  });
});

