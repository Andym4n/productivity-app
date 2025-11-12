import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../../src/components/Modal';

describe('Modal', () => {
  beforeEach(() => {
    // Reset body overflow before each test
    document.body.style.overflow = '';
  });
  
  afterEach(() => {
    // Clean up body overflow after each test
    document.body.style.overflow = '';
  });
  
  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        Content
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  
  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        Content
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/content/i)).toBeInTheDocument();
  });
  
  it('displays title when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        Content
      </Modal>
    );
    expect(screen.getByText(/test modal/i)).toBeInTheDocument();
  });
  
  it('calls onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Content
      </Modal>
    );
    
    const closeButton = screen.getByRole('button', { name: /close modal/i });
    await user.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
  
  it('calls onClose when ESC key is pressed', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Content
      </Modal>
    );
    
    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
  
  it('calls onClose when backdrop is clicked if closeOnBackdropClick is true', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Modal isOpen={true} onClose={handleClose} closeOnBackdropClick={true}>
        Content
      </Modal>
    );
    
    // Click on the backdrop div (the one with backdrop-blur-sm class)
    const backdrop = container.querySelector('.backdrop-blur-sm');
    if (backdrop) {
      await user.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });
  
  it('does not call onClose when backdrop is clicked if closeOnBackdropClick is false', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Modal isOpen={true} onClose={handleClose} closeOnBackdropClick={false}>
        Content
      </Modal>
    );
    
    const backdrop = container.querySelector('.backdrop-blur-sm');
    if (backdrop) {
      await user.click(backdrop);
      expect(handleClose).not.toHaveBeenCalled();
    }
  });
  
  it('does not call onClose when modal content is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnBackdropClick={true}>
        <div>Content</div>
      </Modal>
    );
    
    const content = screen.getByText(/content/i);
    await user.click(content);
    expect(handleClose).not.toHaveBeenCalled();
  });
  
  it('has correct aria attributes', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <p id="modal-description">Description</p>
      </Modal>
    );
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'modal-description');
  });
  
  it('applies correct size classes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} size="sm">
        Content
      </Modal>
    );
    let modalContent = screen.getByRole('dialog').querySelector('.max-w-md');
    expect(modalContent).toBeInTheDocument();
    
    rerender(
      <Modal isOpen={true} onClose={() => {}} size="lg">
        Content
      </Modal>
    );
    modalContent = screen.getByRole('dialog').querySelector('.max-w-2xl');
    expect(modalContent).toBeInTheDocument();
  });
  
  it('prevents body scroll when open', () => {
    render(<Modal isOpen={true} onClose={() => {}}>Content</Modal>);
    expect(document.body.style.overflow).toBe('hidden');
  });
  
  it('restores body scroll when closed', () => {
    const { rerender } = render(<Modal isOpen={true} onClose={() => {}}>Content</Modal>);
    expect(document.body.style.overflow).toBe('hidden');
    
    rerender(<Modal isOpen={false} onClose={() => {}}>Content</Modal>);
    expect(document.body.style.overflow).toBe('');
  });
});

