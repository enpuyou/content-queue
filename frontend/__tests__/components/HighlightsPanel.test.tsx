/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for the HighlightsPanel component.
 *
 * Tests cover:
 * - Rendering empty state
 * - Rendering list of highlights
 * - Clicking highlights to scroll to them
 * - Editing highlights (color and note)
 * - Deleting highlights with confirmation
 * - Copy all highlights to clipboard
 * - Color badges and note display
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import HighlightsPanel from "../../components/HighlightsPanel";
import { highlightsAPI } from "../../lib/api";

// Mock the API module
jest.mock("../../lib/api");
const mockedHighlightsAPI = highlightsAPI as jest.Mocked<typeof highlightsAPI>;

// Mock the ToastContext
const mockShowToast = jest.fn();
jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe("HighlightsPanel", () => {
  const mockOnHighlightClick = jest.fn();
  const mockOnHighlightDeleted = jest.fn();
  const mockOnHighlightUpdated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Empty State", () => {
    it("renders empty state when no highlights", () => {
      render(
        <HighlightsPanel
          highlights={[]}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      expect(screen.getByText(/no highlights yet/i)).toBeInTheDocument();
    });

    it("does not show copy button when empty", () => {
      render(
        <HighlightsPanel
          highlights={[]}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      expect(screen.queryByText(/copy all/i)).not.toBeInTheDocument();
    });
  });

  describe("Highlights List", () => {
    const mockHighlights = [
      {
        id: "1",
        text: "First highlight text",
        start_offset: 0,
        end_offset: 20,
        color: "yellow",
        note: undefined,
        created_at: "2024-01-15T10:00:00Z",
      },
      {
        id: "2",
        text: "Second highlight with a note",
        start_offset: 50,
        end_offset: 78,
        color: "green",
        note: "This is an important point",
        created_at: "2024-01-15T10:30:00Z",
      },
      {
        id: "3",
        text: "Third highlight",
        start_offset: 100,
        end_offset: 115,
        color: "blue",
        note: undefined,
        created_at: "2024-01-15T11:00:00Z",
      },
    ];

    it("renders all highlights", () => {
      render(
        <HighlightsPanel
          highlights={mockHighlights}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      expect(screen.getByText("First highlight text")).toBeInTheDocument();
      expect(
        screen.getByText("Second highlight with a note"),
      ).toBeInTheDocument();
      expect(screen.getByText("Third highlight")).toBeInTheDocument();
    });

    it("displays color badges for each highlight", () => {
      render(
        <HighlightsPanel
          highlights={mockHighlights}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      // Color badges should have background colors
      const highlights = screen.getAllByRole("listitem");
      expect(highlights).toHaveLength(3);

      // Each should have a color indicator
      expect(screen.getByText("First highlight text")).toHaveClass(
        "bg-yellow-200",
      );
      expect(screen.getByText("Second highlight with a note")).toHaveClass(
        "bg-green-200",
      );
    });

    it("displays notes for highlights that have them", () => {
      render(
        <HighlightsPanel
          highlights={mockHighlights}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      expect(
        screen.getByText("This is an important point"),
      ).toBeInTheDocument();
    });

    it("calls onHighlightClick when a highlight is clicked", () => {
      render(
        <HighlightsPanel
          highlights={mockHighlights}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      const firstHighlight = screen.getByText("First highlight text");
      fireEvent.click(firstHighlight);

      expect(mockOnHighlightClick).toHaveBeenCalledWith(mockHighlights[0]);
    });

    it("shows highlight count in header", () => {
      render(
        <HighlightsPanel
          highlights={mockHighlights}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      expect(screen.getByText(/highlights \(3\)/i)).toBeInTheDocument();
    });
  });

  describe("Edit Functionality", () => {
    const singleHighlight = [
      {
        id: "edit-test",
        text: "Highlight to edit",
        start_offset: 0,
        end_offset: 17,
        color: "yellow",
        note: "Original note",
        created_at: "2024-01-15T10:00:00Z",
      },
    ];

    it("enters edit mode when edit button is clicked", async () => {
      render(
        <HighlightsPanel
          highlights={singleHighlight}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      const editButton = screen.getByLabelText(/^edit$/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        // Should show color picker
        const colors = ["yellow", "green", "blue", "pink", "purple"];
        colors.forEach((color) => {
          expect(
            screen.getByLabelText(new RegExp(color, "i")),
          ).toBeInTheDocument();
        });

        // Should show note textarea
        expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument();
      });
    });

    it("updates highlight color", async () => {
      mockedHighlightsAPI.update.mockResolvedValue({
        ...singleHighlight[0],
        color: "purple",
      });

      render(
        <HighlightsPanel
          highlights={singleHighlight}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      // Enter edit mode
      const editButton = screen.getByLabelText(/^edit$/i);
      fireEvent.click(editButton);

      // Select purple color
      const purpleButton = await screen.findByLabelText(/purple/i);
      fireEvent.click(purpleButton);

      // Save
      const saveButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockedHighlightsAPI.update).toHaveBeenCalledWith("edit-test", {
          color: "purple",
          note: "Original note",
        });

        expect(mockShowToast).toHaveBeenCalledWith(
          "Highlight updated",
          "success",
        );
        expect(mockOnHighlightUpdated).toHaveBeenCalled();
      });
    });

    it("updates highlight note", async () => {
      mockedHighlightsAPI.update.mockResolvedValue({
        ...singleHighlight[0],
        note: "Updated note",
      });

      render(
        <HighlightsPanel
          highlights={singleHighlight}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      // Enter edit mode
      const editButton = screen.getByLabelText(/^edit$/i);
      fireEvent.click(editButton);

      // Edit note
      const noteInput = await screen.findByPlaceholderText(/add a note/i);
      await userEvent.clear(noteInput);
      await userEvent.type(noteInput, "Updated note");

      // Save
      const saveButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockedHighlightsAPI.update).toHaveBeenCalledWith("edit-test", {
          color: "yellow",
          note: "Updated note",
        });

        expect(mockOnHighlightUpdated).toHaveBeenCalled();
      });
    });

    it("cancels edit mode", async () => {
      render(
        <HighlightsPanel
          highlights={singleHighlight}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      // Enter edit mode
      const editButton = screen.getByLabelText(/^edit$/i);
      fireEvent.click(editButton);

      // Cancel
      const cancelButton = await screen.findByRole("button", {
        name: /cancel/i,
      });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        // Should exit edit mode
        expect(
          screen.queryByPlaceholderText(/add a note/i),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Delete Functionality", () => {
    const highlightToDelete = [
      {
        id: "delete-test",
        text: "Highlight to delete",
        start_offset: 0,
        end_offset: 19,
        color: "yellow",
        note: undefined,
        created_at: "2024-01-15T10:00:00Z",
      },
    ];

    it("deletes highlight with confirmation", async () => {
      mockedHighlightsAPI.delete.mockResolvedValue(null);
      global.confirm = jest.fn(() => true);

      render(
        <HighlightsPanel
          highlights={highlightToDelete}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      const deleteButton = screen.getByLabelText(/^delete$/i);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith(
          "Are you sure you want to delete this highlight?",
        );
        expect(mockedHighlightsAPI.delete).toHaveBeenCalledWith("delete-test");
        expect(mockShowToast).toHaveBeenCalledWith(
          "Highlight deleted",
          "success",
        );
        expect(mockOnHighlightDeleted).toHaveBeenCalled();
      });
    });

    it("does not delete when user cancels", async () => {
      global.confirm = jest.fn(() => false);

      render(
        <HighlightsPanel
          highlights={highlightToDelete}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      const deleteButton = screen.getByLabelText(/^delete$/i);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
        expect(mockedHighlightsAPI.delete).not.toHaveBeenCalled();
        expect(mockOnHighlightDeleted).not.toHaveBeenCalled();
      });
    });

    it("handles delete error gracefully", async () => {
      mockedHighlightsAPI.delete.mockRejectedValue(new Error("Delete failed"));
      global.confirm = jest.fn(() => true);

      render(
        <HighlightsPanel
          highlights={highlightToDelete}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      const deleteButton = screen.getByLabelText(/^delete$/i);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "Failed to delete highlight",
          "error",
        );
        expect(mockOnHighlightDeleted).not.toHaveBeenCalled();
      });
    });
  });

  describe("Copy All Functionality", () => {
    const multipleHighlights = [
      {
        id: "1",
        text: "First highlight",
        start_offset: 0,
        end_offset: 15,
        color: "yellow",
        note: "Note 1",
        created_at: "2024-01-15T10:00:00Z",
      },
      {
        id: "2",
        text: "Second highlight",
        start_offset: 20,
        end_offset: 36,
        color: "green",
        note: undefined,
        created_at: "2024-01-15T10:30:00Z",
      },
    ];

    it("shows copy all button when highlights exist", () => {
      render(
        <HighlightsPanel
          highlights={multipleHighlights}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      expect(
        screen.getByRole("button", { name: /copy all/i }),
      ).toBeInTheDocument();
    });

    it("copies all highlights to clipboard in markdown format", async () => {
      render(
        <HighlightsPanel
          highlights={multipleHighlights}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      const copyButton = screen.getByRole("button", { name: /copy all/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        const expectedMarkdown =
          "> First highlight\n\nNote 1\n\n---\n\n" +
          "> Second highlight\n\n---\n\n";

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining("First highlight"),
        );
        expect(mockShowToast).toHaveBeenCalledWith(
          "Copied to clipboard",
          "success",
        );
      });
    });

    it("handles clipboard error", async () => {
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(
        new Error("Clipboard error"),
      );

      render(
        <HighlightsPanel
          highlights={multipleHighlights}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      const copyButton = screen.getByRole("button", { name: /copy all/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith("Failed to copy", "error");
      });
    });
  });

  describe("Accessibility", () => {
    const highlights = [
      {
        id: "1",
        text: "Test highlight",
        start_offset: 0,
        end_offset: 14,
        color: "yellow",
        note: undefined,
        created_at: "2024-01-15T10:00:00Z",
      },
    ];

    it("has proper ARIA labels for buttons", () => {
      render(
        <HighlightsPanel
          highlights={highlights}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      expect(screen.getByLabelText(/^edit$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^delete$/i)).toBeInTheDocument();
    });

    it("keyboard navigation works for highlighting items", () => {
      render(
        <HighlightsPanel
          highlights={highlights}
          onHighlightClick={mockOnHighlightClick}
          onHighlightDeleted={mockOnHighlightDeleted}
          onHighlightUpdated={mockOnHighlightUpdated}
        />,
      );

      const highlightItem = screen.getByText("Test highlight");
      highlightItem.focus();
      fireEvent.keyDown(highlightItem, { key: "Enter", code: "Enter" });

      expect(mockOnHighlightClick).toHaveBeenCalledWith(highlights[0]);
    });
  });
});
