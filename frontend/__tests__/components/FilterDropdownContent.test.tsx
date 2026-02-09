import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FilterDropdownContent } from "../../components/FilterDropdownContent";

describe("FilterDropdownContent", () => {
  const defaultProps = {
    currentFilter: "all" as const,
    onSelectFilter: jest.fn(),
    currentTags: [],
    onToggleTag: jest.fn(),
    onClearTags: jest.fn(),
    availableTags: [
      { tag: "tech", count: 5 },
      { tag: "science", count: 2 },
      { tag: "art", count: 3 },
    ],
  };

  it("renders correctly", () => {
    render(<FilterDropdownContent {...defaultProps} />);
    expect(screen.getByText(/UNREAD/i)).toBeInTheDocument();
  });

  it("switches tabs between Status and Tags", () => {
    render(<FilterDropdownContent {...defaultProps} />);

    // Switch to Tags
    fireEvent.click(screen.getByText("Tags"));
    expect(screen.getByPlaceholderText(/FILTER/i)).toBeInTheDocument();
    expect(screen.getByText("#tech")).toBeInTheDocument();
  });

  it("supports tag toggling", () => {
    const onToggleTag = jest.fn();
    render(
      <FilterDropdownContent {...defaultProps} onToggleTag={onToggleTag} />,
    );

    // Go to Tags tab
    fireEvent.click(screen.getByText("Tags"));

    // Click '#tech' button - tags are now displayed as #tech
    fireEvent.click(screen.getByText("#tech"));
    expect(onToggleTag).toHaveBeenCalledWith("tech");
  });

  it("shows '#all' button and can clear tags", () => {
    const onClearTags = jest.fn();
    render(
      <FilterDropdownContent
        {...defaultProps}
        currentTags={["tech"]}
        onClearTags={onClearTags}
      />,
    );

    // Go to Tags tab
    fireEvent.click(screen.getByText("Tags"));

    const allBtn = screen.getByText("#all");
    expect(allBtn).toBeInTheDocument();

    fireEvent.click(allBtn);
    expect(onClearTags).toHaveBeenCalled();
  });

  it("filters tag list based on search input", () => {
    render(<FilterDropdownContent {...defaultProps} />);

    // Go to Tags tab
    fireEvent.click(screen.getByText("Tags"));

    const searchInput = screen.getByPlaceholderText(/FILTER/i);
    fireEvent.change(searchInput, { target: { value: "sci" } });

    expect(screen.getByText("#science")).toBeInTheDocument();
    expect(screen.queryByText("#art")).not.toBeInTheDocument();
  });
});
