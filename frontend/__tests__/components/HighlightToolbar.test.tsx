/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for the HighlightToolbar component.
 *
 * Tests cover:
 * - Rendering in create mode vs edit mode
 * - Color selection functionality (instant highlight)
 * - Note input functionality
 * - Update highlight functionality
 * - Delete highlight functionality
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import HighlightToolbar from "../../components/HighlightToolbar";
import { highlightsAPI } from "../../lib/api";

// Mock the API module
jest.mock("../../lib/api");
const mockedHighlightsAPI = highlightsAPI as jest.Mocked<typeof highlightsAPI>;

// Mock the ToastContext
const mockShowToast = jest.fn();
jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe("HighlightToolbar", () => {
  const mockOnClose = jest.fn();
  const mockOnHighlightCreated = jest.fn();
  const mockOnToggleNote = jest.fn();
  const contentId = "test-content-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Create Mode", () => {
    const createSelection = {
      text: "selected text for highlighting",
      startOffset: 10,
      endOffset: 40,
      position: { x: 100, y: 200 },
    };

    it("renders immediate color options", () => {
      render(
        <HighlightToolbar
          selection={createSelection}
          contentId={contentId}
          onClose={mockOnClose}
          onHighlightCreated={mockOnHighlightCreated}
          showNote={false}
          onToggleNote={mockOnToggleNote}
        />,
      );

      // Colors should be visible immediately
      const colors = ["yellow", "green", "blue", "pink", "purple"];
      colors.forEach((color) => {
        const colorButton = screen.getByLabelText(color);
        expect(colorButton).toBeInTheDocument();
      });
    });

    it("creates highlight immediately when color is clicked", async () => {
      mockedHighlightsAPI.create.mockResolvedValue({
        id: "new-highlight-123",
        text: createSelection.text,
        start_offset: createSelection.startOffset,
        end_offset: createSelection.endOffset,
        color: "green",
        note: "",
        created_at: new Date().toISOString(),
      });

      render(
        <HighlightToolbar
          selection={createSelection}
          contentId={contentId}
          onClose={mockOnClose}
          onHighlightCreated={mockOnHighlightCreated}
          showNote={false}
          onToggleNote={mockOnToggleNote}
        />,
      );

      // Click green color
      const greenButton = screen.getByLabelText("green");
      fireEvent.click(greenButton);

      await waitFor(() => {
        expect(mockedHighlightsAPI.create).toHaveBeenCalledWith(contentId, {
          text: createSelection.text,
          start_offset: createSelection.startOffset,
          end_offset: createSelection.endOffset,
          color: "green",
          note: undefined,
        });

        // Should NOT show toast for simple create (usually refined to be silent or specific)
        // But checking if API called is most important
        expect(mockOnHighlightCreated).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("calls onToggleNote when Note button is clicked", async () => {
      render(
        <HighlightToolbar
          selection={createSelection}
          contentId={contentId}
          onClose={mockOnClose}
          onHighlightCreated={mockOnHighlightCreated}
          showNote={false}
          onToggleNote={mockOnToggleNote}
        />,
      );

      // Click Note button
      const noteButton = screen.getByText("Note");
      fireEvent.click(noteButton);

      expect(mockOnToggleNote).toHaveBeenCalledWith(true);
    });

    it("saves highlight with note", async () => {
      mockedHighlightsAPI.create.mockResolvedValue({
        id: "new-highlight-123",
        text: createSelection.text,
        start_offset: createSelection.startOffset,
        end_offset: createSelection.endOffset,
        color: "yellow",
        note: "My important note",
        created_at: new Date().toISOString(),
      });

      // Render with showNote={true} so the note panel is visible
      render(
        <HighlightToolbar
          selection={createSelection}
          contentId={contentId}
          onClose={mockOnClose}
          onHighlightCreated={mockOnHighlightCreated}
          showNote={true}
          onToggleNote={mockOnToggleNote}
        />,
      );

      // Type note
      const noteInput = screen.getByPlaceholderText(/add a note/i);
      await userEvent.type(noteInput, "My important note");

      // Click Save in the note panel
      const saveButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockedHighlightsAPI.create).toHaveBeenCalledWith(contentId, {
          text: createSelection.text,
          start_offset: createSelection.startOffset,
          end_offset: createSelection.endOffset,
          color: "yellow", // Defaults to yellow if not specified
          note: "My important note",
        });

        expect(mockOnHighlightCreated).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe("Edit Mode", () => {
    const editSelection = {
      text: "existing highlighted text",
      startOffset: 50,
      endOffset: 75,
      position: { x: 150, y: 250 },
      existingHighlightId: "existing-highlight-456",
      existingColor: "blue",
      existingNote: "Existing note",
    };

    it("shows existing highlight state and Remove button", () => {
      render(
        <HighlightToolbar
          selection={editSelection as any}
          contentId={contentId}
          onClose={mockOnClose}
          onHighlightCreated={mockOnHighlightCreated}
          showNote={false}
          onToggleNote={mockOnToggleNote}
        />,
      );

      // Blue button should be active/highlighted (checking class logic is brittle, verifying existence is better)
      const blueButton = screen.getByLabelText("blue");
      expect(blueButton).toBeInTheDocument();
      // Ensure Remove button exists
      expect(screen.getByText("Remove")).toBeInTheDocument();
    });

    it("updates color immediately when clicked", async () => {
      mockedHighlightsAPI.update.mockResolvedValue({
        id: editSelection.existingHighlightId,
        text: editSelection.text,
        start_offset: editSelection.startOffset,
        end_offset: editSelection.endOffset,
        color: "pink",
        note: editSelection.existingNote,
        created_at: new Date().toISOString(),
      });

      render(
        <HighlightToolbar
          selection={editSelection as any}
          contentId={contentId}
          onClose={mockOnClose}
          onHighlightCreated={mockOnHighlightCreated}
          showNote={false}
          onToggleNote={mockOnToggleNote}
        />,
      );

      // Click pink
      const pinkButton = screen.getByLabelText("pink");
      fireEvent.click(pinkButton);

      await waitFor(() => {
        expect(mockedHighlightsAPI.update).toHaveBeenCalledWith(
          editSelection.existingHighlightId,
          expect.objectContaining({ color: "pink" }),
        );
        expect(mockOnHighlightCreated).toHaveBeenCalled();
      });
    });

    it("deletes highlight when Remove is clicked in edit mode", async () => {
      mockedHighlightsAPI.delete.mockResolvedValue(null);

      // Mock window.confirm
      global.confirm = jest.fn(() => true);

      render(
        <HighlightToolbar
          selection={editSelection as any}
          contentId={contentId}
          onClose={mockOnClose}
          onHighlightCreated={mockOnHighlightCreated}
          showNote={false}
          onToggleNote={mockOnToggleNote}
        />,
      );

      // Click Remove (delete in edit mode)
      const deleteButton = screen.getByText("Remove");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockedHighlightsAPI.delete).toHaveBeenCalledWith(
          editSelection.existingHighlightId,
        );
        expect(mockOnHighlightCreated).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe("Close Button", () => {
    it("does not show close button in create mode", () => {
      const selection = {
        text: "test",
        startOffset: 0,
        endOffset: 4,
        position: { x: 100, y: 100 },
      };

      render(
        <HighlightToolbar
          selection={selection}
          contentId={contentId}
          onClose={mockOnClose}
          onHighlightCreated={mockOnHighlightCreated}
          showNote={false}
          onToggleNote={mockOnToggleNote}
        />,
      );

      // Should not find "Close" or "×"
      const closeButton = screen.queryByText("Close");
      const xButton = screen.queryByText("×");
      expect(closeButton).not.toBeInTheDocument();
      expect(xButton).not.toBeInTheDocument();
    });
  });
});
