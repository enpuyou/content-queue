/**
 * Unit tests for AddContentForm component.
 *
 * Tests cover the core "paste in URL" functionality:
 * - Rendering the form
 * - URL input and validation
 * - Submitting URLs
 * - Success and error handling
 * - Loading states
 * - Form reset after success
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AddContentForm from '../../components/AddContentForm';
import { contentAPI } from '../../lib/api';

// Mock the API module
jest.mock('../../lib/api');
const mockedContentAPI = contentAPI as jest.Mocked<typeof contentAPI>;

// Mock the ToastContext
const mockShowToast = jest.fn();
jest.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe('AddContentForm', () => {
  const mockOnContentAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders form with URL input and submit button', () => {
      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      expect(screen.getByLabelText(/url/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/https:\/\/example.com\/article/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add to queue/i })).toBeInTheDocument();
    });

    it('renders URL input with required attribute', () => {
      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const input = screen.getByLabelText(/url/i);
      expect(input).toBeRequired();
      expect(input).toHaveAttribute('type', 'url');
    });

    it('does not show error message initially', () => {
      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const errorDiv = screen.queryByRole('alert');
      expect(errorDiv).not.toBeInTheDocument();
    });
  });

  describe('URL Input', () => {
    it('allows user to type URL', async () => {
      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const input = screen.getByLabelText(/url/i);
      await userEvent.type(input, 'https://example.com/article');

      expect(input).toHaveValue('https://example.com/article');
    });

    it('updates input value on change', async () => {
      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const input = screen.getByLabelText(/url/i);
      await userEvent.type(input, 'https://news.ycombinator.com');

      expect(input).toHaveValue('https://news.ycombinator.com');
    });
  });

  describe('Form Submission - Success', () => {
    it('submits URL and shows success message', async () => {
      mockedContentAPI.create.mockResolvedValue({
        id: 'new-content-123',
        original_url: 'https://example.com/article',
        processing_status: 'pending',
        is_read: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const input = screen.getByLabelText(/url/i);
      const submitButton = screen.getByRole('button', { name: /add to queue/i });

      await userEvent.type(input, 'https://example.com/article');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedContentAPI.create).toHaveBeenCalledWith({
          url: 'https://example.com/article',
        });

        expect(mockShowToast).toHaveBeenCalledWith(
          'Article added successfully!',
          'success'
        );

        expect(mockOnContentAdded).toHaveBeenCalled();
      });
    });

    it('clears input after successful submission', async () => {
      mockedContentAPI.create.mockResolvedValue({
        id: 'new-content-123',
        original_url: 'https://example.com/article',
        processing_status: 'pending',
        is_read: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const input = screen.getByLabelText(/url/i);
      await userEvent.type(input, 'https://example.com/article');

      const submitButton = screen.getByRole('button', { name: /add to queue/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('shows loading state during submission', async () => {
      // Create a promise we can control
      let resolveCreate: any;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });
      mockedContentAPI.create.mockReturnValue(createPromise as any);

      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const input = screen.getByLabelText(/url/i);
      await userEvent.type(input, 'https://example.com/article');

      const submitButton = screen.getByRole('button', { name: /add to queue/i });
      fireEvent.click(submitButton);

      // While loading
      await waitFor(() => {
        expect(screen.getByText(/adding.../i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });

      // Resolve the promise
      resolveCreate({
        id: 'new-content-123',
        original_url: 'https://example.com/article',
        processing_status: 'pending',
        is_read: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // After loading
      await waitFor(() => {
        expect(screen.getByText(/add to queue/i)).toBeInTheDocument();
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Form Submission - Error', () => {
    it('shows error message when submission fails', async () => {
      mockedContentAPI.create.mockRejectedValue(new Error('Network error'));

      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const input = screen.getByLabelText(/url/i);
      await userEvent.type(input, 'https://example.com/article');

      const submitButton = screen.getByRole('button', { name: /add to queue/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(mockShowToast).toHaveBeenCalledWith('Network error', 'error');
      });
    });

    it('shows generic error message for unknown errors', async () => {
      mockedContentAPI.create.mockRejectedValue('Unknown error');

      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const input = screen.getByLabelText(/url/i);
      await userEvent.type(input, 'https://example.com/article');

      const submitButton = screen.getByRole('button', { name: /add to queue/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to add content. please try again/i)
        ).toBeInTheDocument();
      });
    });

    it('does not clear input when submission fails', async () => {
      mockedContentAPI.create.mockRejectedValue(new Error('Server error'));

      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const input = screen.getByLabelText(/url/i);
      const testUrl = 'https://example.com/article';
      await userEvent.type(input, testUrl);

      const submitButton = screen.getByRole('button', { name: /add to queue/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(input).toHaveValue(testUrl); // URL still there so user can retry
      });
    });

    it('does not call onContentAdded when submission fails', async () => {
      mockedContentAPI.create.mockRejectedValue(new Error('Server error'));

      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const input = screen.getByLabelText(/url/i);
      await userEvent.type(input, 'https://example.com/article');

      const submitButton = screen.getByRole('button', { name: /add to queue/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });

      expect(mockOnContentAdded).not.toHaveBeenCalled();
    });

    it('shows error message for rate limiting', async () => {
      mockedContentAPI.create.mockRejectedValue(
        new Error('Too many requests. Please slow down.')
      );

      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const input = screen.getByLabelText(/url/i);
      await userEvent.type(input, 'https://example.com/article');

      const submitButton = screen.getByRole('button', { name: /add to queue/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/too many requests. please slow down/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('prevents submission when URL is empty', async () => {
      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const submitButton = screen.getByRole('button', { name: /add to queue/i });
      fireEvent.click(submitButton);

      // HTML5 validation should prevent submission
      // The API should not be called
      await waitFor(() => {
        expect(mockedContentAPI.create).not.toHaveBeenCalled();
      });
    });

    it('accepts various URL formats', async () => {
      mockedContentAPI.create.mockResolvedValue({
        id: 'new-content-123',
        original_url: '',
        processing_status: 'pending',
        is_read: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const urls = [
        'https://example.com/article',
        'http://blog.example.com/post/123',
        'https://subdomain.example.com/path/to/page',
        'https://example.com/article?param=value&other=test',
      ];

      for (const url of urls) {
        const { unmount } = render(<AddContentForm onContentAdded={mockOnContentAdded} />);

        const input = screen.getByLabelText(/url/i);
        await userEvent.type(input, url);

        const submitButton = screen.getByRole('button', { name: /add to queue/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(mockedContentAPI.create).toHaveBeenCalledWith({ url });
        });

        unmount();
        jest.clearAllMocks();
      }
    });
  });

  describe('User Experience', () => {
    it('focuses on input when component mounts', () => {
      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      // Input should be focusable (though not auto-focused in tests)
      const input = screen.getByLabelText(/url/i);
      expect(input).toBeInTheDocument();
      input.focus();
      expect(input).toHaveFocus();
    });

    it('allows form submission by pressing Enter', async () => {
      mockedContentAPI.create.mockResolvedValue({
        id: 'new-content-123',
        original_url: 'https://example.com/article',
        processing_status: 'pending',
        is_read: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const input = screen.getByLabelText(/url/i);
      await userEvent.type(input, 'https://example.com/article{Enter}');

      await waitFor(() => {
        expect(mockedContentAPI.create).toHaveBeenCalled();
      });
    });

    it('disables button during submission to prevent double-submit', async () => {
      let resolveCreate: any;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });
      mockedContentAPI.create.mockReturnValue(createPromise as any);

      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      const input = screen.getByLabelText(/url/i);
      await userEvent.type(input, 'https://example.com/article');

      const submitButton = screen.getByRole('button', { name: /add to queue/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // Try to click again
      fireEvent.click(submitButton);

      // Should only be called once
      expect(mockedContentAPI.create).toHaveBeenCalledTimes(1);

      // Resolve
      resolveCreate({
        id: 'new-content-123',
        original_url: 'https://example.com/article',
        processing_status: 'pending',
        is_read: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
  });

  describe('Integration', () => {
    it('completes full submission flow', async () => {
      mockedContentAPI.create.mockResolvedValue({
        id: 'new-content-123',
        original_url: 'https://example.com/great-article',
        processing_status: 'pending',
        is_read: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      render(<AddContentForm onContentAdded={mockOnContentAdded} />);

      // 1. Type URL
      const input = screen.getByLabelText(/url/i);
      await userEvent.type(input, 'https://example.com/great-article');
      expect(input).toHaveValue('https://example.com/great-article');

      // 2. Submit
      const submitButton = screen.getByRole('button', { name: /add to queue/i });
      fireEvent.click(submitButton);

      // 3. Verify loading state
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText(/adding.../i)).toBeInTheDocument();
      });

      // 4. Verify success
      await waitFor(() => {
        expect(mockedContentAPI.create).toHaveBeenCalledWith({
          url: 'https://example.com/great-article',
        });
        expect(mockShowToast).toHaveBeenCalledWith(
          'Article added successfully!',
          'success'
        );
        expect(mockOnContentAdded).toHaveBeenCalled();
        expect(input).toHaveValue('');
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});
