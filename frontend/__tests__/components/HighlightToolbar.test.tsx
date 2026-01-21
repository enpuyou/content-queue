/**
 * Unit tests for the HighlightToolbar component.
 *
 * Tests cover:
 * - Rendering in create mode vs edit mode
 * - Color selection functionality
 * - Note input behavior
 * - Save highlight (create) functionality
 * - Update highlight functionality
 * - Delete highlight functionality
 * - State reset when selection changes
 * - Auto-focus behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import HighlightToolbar from '../../components/HighlightToolbar';
import { highlightsAPI } from '../../lib/api';

// Mock the API module
jest.mock('../../lib/api');
const mockedHighlightsAPI = highlightsAPI as jest.Mocked<typeof highlightsAPI>;

// Mock the ToastContext
const mockShowToast = jest.fn();
jest.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe('HighlightToolbar', () => {
  const mockOnClose = jest.fn();
  const mockOnHighlightCreated = jest.fn();
  const contentId = 'test-content-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Mode', () => {
    const createSelection = {
      text: 'selected text for highlighting',
      startOffset: 10,
      endOffset: 40,
      position: { x: 100, y: 200 },
    };

    it('renders in create mode with selected text', () => {
      render(
        <HighlightToolbar
          selection={createSelection}
          contentId={contentId}
          onClose={mockOnClose}
          onHighlightCreated={mockOnHighlightCreated}
        />
      );

      // Should show truncated text
      expect(screen.getByText(/"selected text for highlighti\.\.\."/)).toBeInTheDocument();

      // Should show Save button (not Update)
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /update/i })).not.toBeInTheDocument();

      // Should NOT show Unhighlight button
      expect(screen.queryByRole('button', { name: /unhighlight/i })).not.toBeInTheDocument();
    });

    it('renders all color options', () => {
      render(
        <HighlightToolbar
          selection={createSelection}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      const colors = ['yellow', 'green', 'blue', 'pink', 'purple'];
      colors.forEach((color) => {
        const colorButton = screen.getByLabelText(new RegExp(color, 'i'));
        expect(colorButton).toBeInTheDocument();
      });
    });

    it('defaults to yellow color', () => {
      render(
        <HighlightToolbar
          selection={createSelection}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      const yellowButton = screen.getByLabelText(/yellow/i);
      // The selected color should have a ring around it (check for ring class or aria-pressed)
      expect(yellowButton).toHaveClass('ring-2');
    });

    it('allows changing color before saving', async () => {
      render(
        <HighlightToolbar
          selection={createSelection}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      const greenButton = screen.getByLabelText(/green/i);
      fireEvent.click(greenButton);

      await waitFor(() => {
        expect(greenButton).toHaveClass('ring-2');
      });
    });

    it('shows note input when "Add Note" is clicked', async () => {
      render(
        <HighlightToolbar
          selection={createSelection}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      const addNoteButton = screen.getByRole('button', { name: /add note/i });
      fireEvent.click(addNoteButton);

      await waitFor(() => {
        const noteInput = screen.getByPlaceholderText(/add a note/i);
        expect(noteInput).toBeInTheDocument();
      });
    });

    it('creates highlight with selected color and note', async () => {
      mockedHighlightsAPI.create.mockResolvedValue({
        id: 'new-highlight-123',
        text: createSelection.text,
        start_offset: createSelection.startOffset,
        end_offset: createSelection.endOffset,
        color: 'green',
        note: 'Important point',
        created_at: new Date().toISOString(),
      });

      render(
        <HighlightToolbar
          selection={createSelection}
          contentId={contentId}
          onClose={mockOnClose}
          onHighlightCreated={mockOnHighlightCreated}
        />
      );

      // Select green color
      const greenButton = screen.getByLabelText(/green/i);
      fireEvent.click(greenButton);

      // Add note
      const addNoteButton = screen.getByRole('button', { name: /add note/i });
      fireEvent.click(addNoteButton);

      const noteInput = await screen.findByPlaceholderText(/add a note/i);
      await userEvent.type(noteInput, 'Important point');

      // Save
      const saveButton = screen.getByRole('button', { name: /^save$/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockedHighlightsAPI.create).toHaveBeenCalledWith(contentId, {
          text: createSelection.text,
          start_offset: createSelection.startOffset,
          end_offset: createSelection.endOffset,
          color: 'green',
          note: 'Important point',
        });

        expect(mockShowToast).toHaveBeenCalledWith('Highlight saved', 'success');
        expect(mockOnHighlightCreated).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('handles API error gracefully', async () => {
      mockedHighlightsAPI.create.mockRejectedValue(new Error('Network error'));

      render(
        <HighlightToolbar
          selection={createSelection}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByRole('button', { name: /^save$/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Network error', 'error');
        expect(mockOnClose).not.toHaveBeenCalled(); // Should stay open on error
      });
    });
  });

  describe('Edit Mode', () => {
    const editSelection = {
      text: 'existing highlighted text',
      startOffset: 50,
      endOffset: 75,
      position: { x: 150, y: 250 },
      existingHighlightId: 'existing-highlight-456',
      existingColor: 'blue',
      existingNote: 'Existing note',
    };

    it('renders in edit mode with existing highlight data', () => {
      render(
        <HighlightToolbar
          selection={editSelection as any}
          contentId={contentId}
          onClose={mockOnClose}
          onHighlightCreated={mockOnHighlightCreated}
        />
      );

      // Should show Update button (not Save)
      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();

      // Should show Unhighlight button
      expect(screen.getByRole('button', { name: /unhighlight/i })).toBeInTheDocument();
    });

    it('pre-selects existing color in edit mode', () => {
      render(
        <HighlightToolbar
          selection={editSelection as any}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      const blueButton = screen.getByLabelText(/blue/i);
      expect(blueButton).toHaveClass('ring-2');
    });

    it('shows existing note in edit mode', () => {
      render(
        <HighlightToolbar
          selection={editSelection as any}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      const noteInput = screen.getByPlaceholderText(/edit note/i);
      expect(noteInput).toHaveValue('Existing note');
    });

    it('note textarea does not auto-focus in edit mode', () => {
      render(
        <HighlightToolbar
          selection={editSelection as any}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      const noteInput = screen.getByPlaceholderText(/edit note/i);
      expect(noteInput).not.toHaveFocus();
    });

    it('updates highlight with changed color', async () => {
      mockedHighlightsAPI.update.mockResolvedValue({
        id: editSelection.existingHighlightId,
        text: editSelection.text,
        start_offset: editSelection.startOffset,
        end_offset: editSelection.endOffset,
        color: 'purple',
        note: editSelection.existingNote,
        created_at: new Date().toISOString(),
      });

      render(
        <HighlightToolbar
          selection={editSelection as any}
          contentId={contentId}
          onClose={mockOnClose}
          onHighlightCreated={mockOnHighlightCreated}
        />
      );

      // Change color to purple
      const purpleButton = screen.getByLabelText(/purple/i);
      fireEvent.click(purpleButton);

      // Update
      const updateButton = screen.getByRole('button', { name: /update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockedHighlightsAPI.update).toHaveBeenCalledWith(
          editSelection.existingHighlightId,
          {
            color: 'purple',
            note: editSelection.existingNote,
          }
        );

        expect(mockShowToast).toHaveBeenCalledWith('Highlight updated', 'success');
        expect(mockOnHighlightCreated).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('deletes highlight when Unhighlight is clicked', async () => {
      mockedHighlightsAPI.delete.mockResolvedValue(null);

      // Mock window.confirm
      global.confirm = jest.fn(() => true);

      render(
        <HighlightToolbar
          selection={editSelection as any}
          contentId={contentId}
          onClose={mockOnClose}
          onHighlightCreated={mockOnHighlightCreated}
        />
      );

      const unhighlightButton = screen.getByRole('button', { name: /unhighlight/i });
      fireEvent.click(unhighlightButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith('Remove this highlight?');
        expect(mockedHighlightsAPI.delete).toHaveBeenCalledWith(editSelection.existingHighlightId);
        expect(mockShowToast).toHaveBeenCalledWith('Highlight removed', 'success');
        expect(mockOnHighlightCreated).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('does not delete when user cancels confirmation', async () => {
      global.confirm = jest.fn(() => false);

      render(
        <HighlightToolbar
          selection={editSelection as any}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      const unhighlightButton = screen.getByRole('button', { name: /unhighlight/i });
      fireEvent.click(unhighlightButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
        expect(mockedHighlightsAPI.delete).not.toHaveBeenCalled();
      });
    });
  });

  describe('State Management', () => {
    it('resets state when selection changes from one new selection to another', () => {
      const selection1 = {
        text: 'first selection',
        startOffset: 0,
        endOffset: 15,
        position: { x: 100, y: 100 },
      };

      const selection2 = {
        text: 'second selection',
        startOffset: 20,
        endOffset: 36,
        position: { x: 150, y: 150 },
      };

      const { rerender } = render(
        <HighlightToolbar
          selection={selection1}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      // Add a note to first selection
      const addNoteButton = screen.getByRole('button', { name: /add note/i });
      fireEvent.click(addNoteButton);

      const noteInput = screen.getByPlaceholderText(/add a note/i);
      fireEvent.change(noteInput, { target: { value: 'First note' } });

      // Change to second selection
      rerender(
        <HighlightToolbar
          selection={selection2}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      // Note should be cleared
      const newNoteInput = screen.queryByPlaceholderText(/add a note/i);
      // Note input should not be visible anymore (or empty if visible)
      if (newNoteInput) {
        expect(newNoteInput).toHaveValue('');
      }
    });

    it('resets state when moving from edit mode to create mode', () => {
      const editSelection = {
        text: 'edited text',
        startOffset: 10,
        endOffset: 21,
        position: { x: 100, y: 100 },
        existingHighlightId: 'test-id',
        existingColor: 'purple',
        existingNote: 'Old note',
      };

      const newSelection = {
        text: 'new text',
        startOffset: 30,
        endOffset: 38,
        position: { x: 150, y: 150 },
      };

      const { rerender } = render(
        <HighlightToolbar
          selection={editSelection as any}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      // Should be in edit mode
      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/edit note/i)).toHaveValue('Old note');

      // Switch to new selection
      rerender(
        <HighlightToolbar
          selection={newSelection}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      // Should be in create mode with reset state
      expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
      const yellowButton = screen.getByLabelText(/yellow/i);
      expect(yellowButton).toHaveClass('ring-2'); // Back to default yellow
    });
  });

  describe('Toolbar Positioning', () => {
    it('positions toolbar based on selection position', () => {
      const selection = {
        text: 'test',
        startOffset: 0,
        endOffset: 4,
        position: { x: 200, y: 300 },
      };

      const { container } = render(
        <HighlightToolbar
          selection={selection}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      const toolbar = container.firstChild as HTMLElement;
      expect(toolbar).toHaveStyle({
        left: '200px',
        top: '300px',
      });
    });
  });

  describe('Close Button', () => {
    it('closes toolbar when X button is clicked', () => {
      const selection = {
        text: 'test',
        startOffset: 0,
        endOffset: 4,
        position: { x: 100, y: 100 },
      };

      render(
        <HighlightToolbar
          selection={selection}
          contentId={contentId}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
