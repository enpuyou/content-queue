# Testing Documentation for Content Queue

## Overview

This document explains the comprehensive test suite for the Content Queue application, covering all core functionalities:

- Content submission and extraction (paste in URL)
- Content CRUD operations (read, update, delete)
- Lists and collection management
- Highlights and annotations
- Frontend components and user interactions

## Test Setup

### Frontend Testing Stack
- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom Jest matchers for DOM

### Backend Testing Stack
- **pytest**: Python test framework
- **pytest-asyncio**: Async test support
- **FastAPI TestClient**: API endpoint testing
- **SQLAlchemy**: Database fixtures

## Running Tests

### Frontend Tests
```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Backend Tests
```bash
cd content-queue-backend

# Run all tests
poetry run pytest

# Run with verbose output
poetry run pytest -v

# Run specific test file
poetry run pytest tests/test_highlights_api.py -v

# Run with coverage
poetry run pytest --cov=app tests/
```

## Test Coverage

### Backend API Tests

#### Content API (`content-queue-backend/tests/test_content_api.py`)

**Create Content (Paste URL) - 5 tests:**

- ✅ Successfully submits URL and creates pending content
- ✅ Triggers background metadata extraction job
- ✅ Creates content and adds to lists simultaneously
- ✅ Returns 401 without authentication
- ✅ Validates URL format

**List Content - 7 tests:**

- ✅ Returns empty list when user has no items
- ✅ Lists multiple content items (newest first)
- ✅ Pagination with skip and limit parameters
- ✅ Filters by read/unread status
- ✅ Filters by archived status
- ✅ Excludes soft-deleted items
- ✅ Returns 401 without authentication

**Get Individual Content - 5 tests:**

- ✅ Retrieves specific content item
- ✅ Retrieves full text for reading view
- ✅ Returns 404 for non-existent content
- ✅ Returns 404 for deleted content
- ✅ Returns 401 without authentication

**Update Content - 8 tests:**

- ✅ Marks content as read (sets read_at timestamp)
- ✅ Marks content as unread (clears read_at)
- ✅ Archives content
- ✅ Updates read position (scroll percentage)
- ✅ Updates tags
- ✅ Updates multiple fields simultaneously
- ✅ Returns 404 for non-existent content
- ✅ Returns 401 without authentication

**Delete Content - 4 tests:**

- ✅ Soft deletes content (sets deleted_at)
- ✅ Deleted content doesn't appear in lists
- ✅ Returns 404 for already-deleted content
- ✅ Returns 401 without authentication

**Authorization - 3 tests:**

- ✅ Users cannot access other users' content
- ✅ Users cannot modify other users' content
- ✅ Content list only shows user's own items

##### Total Content API Tests: 32

#### Lists API (`content-queue-backend/tests/test_lists_api.py`)

**Create List - 4 tests:**

- ✅ Successfully creates list with all fields
- ✅ Creates list with minimal fields (just name)
- ✅ Creates shared list
- ✅ Returns 401 without authentication

**Get Lists - 3 tests:**

- ✅ Returns empty array when user has no lists
- ✅ Gets lists with content counts for each
- ✅ Returns 401 without authentication

**Get Specific List - 3 tests:**

- ✅ Retrieves specific list details
- ✅ Returns 404 for non-existent list
- ✅ Returns 401 without authentication

**Get List Content - 3 tests:**

- ✅ Returns empty array for empty list
- ✅ Gets multiple content items from list
- ✅ Excludes deleted content from list

**Add Content to List - 6 tests:**

- ✅ Adds single content item to list
- ✅ Adds multiple content items in one request
- ✅ Handles duplicate additions (idempotent)
- ✅ Returns 404 for non-existent list
- ✅ Returns 404 for non-existent content
- ✅ Verifies content ownership

**Remove Content from List - 4 tests:**

- ✅ Removes content from list (keeps content item)
- ✅ Removes multiple items from list
- ✅ Handles removing non-existent items (idempotent)
- ✅ Verifies list exists

**Update List - 4 tests:**

- ✅ Updates list name
- ✅ Updates list description
- ✅ Changes sharing status
- ✅ Returns 404 for non-existent list

**Delete List - 2 tests:**

- ✅ Deletes list and memberships (keeps content)
- ✅ Returns 404 for non-existent list

**Authorization - 3 tests:**

- ✅ Users cannot access other users' lists
- ✅ Users cannot modify other users' lists
- ✅ List query only shows user's own lists

##### Total Lists API Tests: 32

#### Highlights API (`content-queue-backend/tests/test_highlights_api.py`)

**Create Highlight - 6 tests:**

- ✅ Successfully creates a basic highlight with required fields
- ✅ Creates highlight with optional note
- ✅ Accepts all supported colors (yellow, green, blue, pink, purple)
- ✅ Returns 404 for non-existent content
- ✅ Returns 401 without authentication
- ✅ Validates offset ranges (end > start)

**Get Highlights - 5 tests:**

- ✅ Returns empty list when no highlights exist
- ✅ Retrieves multiple highlights
- ✅ Returns highlights ordered by start_offset
- ✅ Returns 404 for non-existent content
- ✅ Returns 401 without authentication

**Update Highlight - 5 tests:**

- ✅ Updates highlight color
- ✅ Updates highlight note
- ✅ Updates both color and note simultaneously
- ✅ Returns 404 for non-existent highlight
- ✅ Returns 401 without authentication

**Delete Highlight - 4 tests:**

- ✅ Successfully deletes highlight (returns 204)
- ✅ Removes highlight from database
- ✅ Returns 404 for non-existent highlight
- ✅ Returns 401 without authentication

**Highlights Authorization - 3 tests:**

- ✅ Users cannot create highlights on other users' content
- ✅ Users cannot modify other users' highlights
- ✅ Users cannot delete other users' highlights

##### Total Highlights API Tests: 20

##### Total Backend API Tests: 84

---

### Frontend Component Tests

#### HighlightToolbar Tests (`frontend/__tests__/components/HighlightToolbar.test.tsx`)

**Create Mode:**

- ✅ Renders with selected text truncated
- ✅ Shows "Save" button (not "Update")
- ✅ Does not show "Unhighlight" button
- ✅ Successfully creates a basic highlight with required fields
- ✅ Creates highlight with optional note
- ✅ Accepts all supported colors (yellow, green, blue, pink, purple)
- ✅ Returns 404 for non-existent content
- ✅ Returns 401 without authentication
- ✅ Validates offset ranges (end > start)

#### Get Highlights Tests
- ✅ Returns empty list when no highlights exist
- ✅ Retrieves multiple highlights
- ✅ Returns highlights ordered by start_offset
- ✅ Returns 404 for non-existent content
- ✅ Returns 401 without authentication

#### Update Highlight Tests
- ✅ Updates highlight color
- ✅ Updates highlight note
- ✅ Updates both color and note simultaneously
- ✅ Returns 404 for non-existent highlight
- ✅ Returns 401 without authentication

#### Delete Highlight Tests
- ✅ Successfully deletes highlight (returns 204)
- ✅ Removes highlight from database
- ✅ Returns 404 for non-existent highlight
- ✅ Returns 401 without authentication

#### Authorization Tests
- ✅ Users cannot create highlights on other users' content
- ✅ Users cannot modify other users' highlights
- ✅ Users cannot delete other users' highlights

**Total Backend Tests: 20**

### Frontend Component Tests

#### HighlightToolbar Tests (`frontend/__tests__/components/HighlightToolbar.test.tsx`)

**Create Mode:**
- ✅ Renders with selected text truncated
- ✅ Shows "Save" button (not "Update")
- ✅ Does not show "Unhighlight" button
- ✅ Renders all five color options
- ✅ Defaults to yellow color
- ✅ Allows changing color before saving
- ✅ Shows note input when "Add Note" clicked
- ✅ Creates highlight with selected color and note
- ✅ Handles API errors gracefully

**Edit Mode:**
- ✅ Renders with existing highlight data
- ✅ Shows "Update" button (not "Save")
- ✅ Shows "Unhighlight" button
- ✅ Pre-selects existing color
- ✅ Shows existing note
- ✅ Note textarea does NOT auto-focus
- ✅ Updates highlight with changed color
- ✅ Deletes highlight with confirmation
- ✅ Does not delete when user cancels

**State Management:**
- ✅ Resets state when selection changes (new → new)
- ✅ Resets state when mode changes (edit → create)

**UI/UX:**
- ✅ Positions toolbar based on selection coordinates
- ✅ Closes toolbar when X button clicked

**Total HighlightToolbar Tests: 21**

#### HighlightsPanel Tests (`frontend/__tests__/components/HighlightsPanel.test.tsx`)

**Empty State:**
- ✅ Renders "No highlights yet" message
- ✅ Does not show copy button when empty

**Highlights List:**
- ✅ Renders all highlights
- ✅ Displays color badges
- ✅ Displays notes for highlights that have them
- ✅ Calls onHighlightClick when clicked
- ✅ Shows highlight count in header

**Edit Functionality:**
- ✅ Enters edit mode when edit button clicked
- ✅ Updates highlight color
- ✅ Updates highlight note
- ✅ Cancels edit mode

**Delete Functionality:**
- ✅ Deletes highlight with confirmation
- ✅ Does not delete when user cancels
- ✅ Handles delete error gracefully

**Copy All:**
- ✅ Shows copy button when highlights exist
- ✅ Copies all highlights to clipboard in Markdown format
- ✅ Handles clipboard errors

**Accessibility:**
- ⚠️ ARIA labels (needs component adjustment)
- ⚠️ Keyboard navigation (needs component adjustment)

**Total HighlightsPanel Tests: 16**

#### AddContentForm Tests (`frontend/__tests__/components/AddContentForm.test.tsx`)

**Rendering - 3 tests:**

- ✅ Renders form with URL input and submit button
- ✅ URL input has required attribute and correct type
- ✅ Does not show error message initially

**URL Input - 2 tests:**

- ✅ Allows user to type URL
- ✅ Updates input value on change

**Form Submission Success - 4 tests:**

- ✅ Submits URL and shows success message
- ✅ Clears input after successful submission
- ✅ Shows loading state during submission
- ✅ Enables button after submission complete

**Form Submission Error - 5 tests:**

- ✅ Shows error message when submission fails
- ✅ Shows generic error for unknown errors
- ✅ Does not clear input when submission fails
- ✅ Does not call onContentAdded on failure
- ✅ Shows error message for rate limiting

**Form Validation - 3 tests:**

- ✅ Prevents submission when URL is empty
- ✅ Accepts various URL formats (http/https, subdomains, query params)
- ✅ HTML5 validation on URL field

**User Experience - 3 tests:**

- ✅ Allows form submission by pressing Enter
- ✅ Disables button during submission (prevents double-submit)
- ✅ Input is focusable

**Integration - 1 test:**

- ✅ Completes full submission flow (type → submit → loading → success → reset)

##### Total AddContentForm Tests: 21

#### ContentItem Tests (`frontend/__tests__/components/ContentItem.test.tsx`)

**Rendering Basic Info - 7 tests:**

- ✅ Renders content title
- ✅ Renders description when available
- ✅ Shows "Untitled" when no title provided
- ✅ Renders thumbnail when available
- ✅ Does not render thumbnail when unavailable
- ✅ Shows reading time when available
- ✅ Links to reader view

**Status Badges - 5 tests:**

- ✅ Shows "Unread" badge when not read
- ✅ Shows "Read" badge when read
- ✅ Shows "Archived" badge when archived
- ✅ Prioritizes archived status over read status
- ✅ Badge colors are correct

**Processing Status - 4 tests:**

- ✅ Shows pending status badge with animation
- ✅ Shows processing status badge with animation
- ✅ Shows failed status badge
- ✅ Does not show badge when completed

**Mark as Read/Unread - 2 tests:**

- ✅ Calls onStatusChange when marking as read
- ✅ Calls onStatusChange when marking as unread

**Archive/Unarchive - 2 tests:**

- ✅ Calls onStatusChange when archiving
- ✅ Calls onStatusChange when unarchiving

**Tag Management - 8 tests:**

- ✅ Displays existing tags
- ✅ Shows "+ Tag" button to add new tags
- ✅ Enters edit mode when "+ Tag" clicked
- ✅ Shows remove buttons for tags in edit mode
- ✅ Adds a new tag when user types and clicks Add
- ✅ Prevents adding duplicate tags
- ✅ Removes a tag when × button clicked
- ✅ Exits edit mode when Done clicked

**Delete Functionality - 3 tests:**

- ✅ Shows confirmation modal when delete clicked
- ✅ Calls onDelete when deletion confirmed
- ✅ Closes modal and doesn't delete when cancelled

**Add to List - 5 tests:**

- ✅ Shows add to list button when lists provided
- ✅ Does not show button when no lists
- ✅ Shows list dropdown when clicked
- ✅ Calls onAddToList when list selected
- ✅ Closes dropdown after selection

**Remove from List - 2 tests:**

- ✅ Shows remove button when onRemoveFromList provided
- ✅ Calls onRemoveFromList when clicked

**Date Formatting - 1 test:**

- ✅ Shows relative date formatting (Today/Yesterday/days ago)

##### Total ContentItem Tests: 39

##### Total Frontend Tests: 97

## Test Architecture

### Backend Test Fixtures (`conftest.py`)

The backend tests use reusable pytest fixtures:

```python
@pytest.fixture
def db_session():
    """Fresh database session for each test"""
    # Creates tables, yields session, cleans up

@pytest.fixture
def client(db_session):
    """FastAPI test client with injected test DB"""
    # Overrides get_db dependency

@pytest.fixture
def test_user(db_session):
    """Creates a test user (test@example.com)"""
    # Returns User object

@pytest.fixture
def auth_headers(test_user):
    """Authentication headers with JWT token"""
    # Returns {"Authorization": "Bearer <token>"}

@pytest.fixture
def test_content(db_session, test_user):
    """Creates test content item for highlights"""
    # Returns ContentItem object
```

### Frontend Test Mocks

Frontend tests mock external dependencies:

```typescript
// Mock API calls
jest.mock('../../lib/api');
const mockedHighlightsAPI = highlightsAPI as jest.Mocked<typeof highlightsAPI>;

// Mock toast notifications
jest.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});
```

## Core Functionality Tested

### 1. Highlight Creation
- **What**: Users can select text and create a highlight
- **Tests**:
  - Backend: Creates highlight with text offsets, color, optional note
  - Frontend: Toolbar renders, color selection works, saves to API
- **Edge Cases**: Invalid content ID, missing auth, network errors

### 2. Highlight Retrieval
- **What**: Get all highlights for a content item
- **Tests**:
  - Backend: Returns ordered list, handles empty state
  - Frontend: Panel displays highlights, shows count
- **Edge Cases**: No highlights, invalid content ID

### 3. Highlight Updates
- **What**: Change color or note of existing highlight
- **Tests**:
  - Backend: Updates specific fields, preserves others
  - Frontend: Edit mode, color picker, note editing
- **Edge Cases**: Non-existent highlight, unauthorized access

### 4. Highlight Deletion
- **What**: Remove a highlight completely
- **Tests**:
  - Backend: Deletes from database, returns 204
  - Frontend: Confirmation dialog, removes from UI
- **Edge Cases**: User cancellation, API errors

### 5. State Management
- **What**: Toolbar state resets between different selections
- **Tests**:
  - Frontend: Note clears when changing selection
  - Frontend: Color resets to default for new highlights
- **Edge Cases**: Edit → create, create → create transitions

### 6. Authorization
- **What**: Users can only access their own highlights
- **Tests**:
  - Backend: Cannot access other users' content
  - Backend: Cannot modify other users' highlights
- **Edge Cases**: Attempting cross-user access

## Known Issues & Improvements Needed

### Frontend Tests
1. **Console Logs**: Remove debug console.log statements from components before production
2. **ARIA Labels**: Add proper `aria-label` attributes to buttons in HighlightsPanel
3. **Keyboard Navigation**: Implement Enter key handler for highlight click

### Backend Tests
1. **Database**: Currently configured for PostgreSQL (required for ARRAY and Vector types)
   - Create test database: `createdb content_queue_test`
   - Or set `TEST_DATABASE_URL` environment variable
2. **Isolation**: Tests currently share database - consider transaction rollback for better isolation

## Test Patterns & Best Practices

### 1. Arrange-Act-Assert Pattern
```typescript
it('creates highlight with color and note', async () => {
  // Arrange: Set up mocks and render component
  mockedHighlightsAPI.create.mockResolvedValue({ ... });
  render(<HighlightToolbar ... />);

  // Act: Perform user actions
  fireEvent.click(greenButton);
  await userEvent.type(noteInput, 'Test note');
  fireEvent.click(saveButton);

  // Assert: Verify expected outcomes
  expect(mockedHighlightsAPI.create).toHaveBeenCalledWith(...);
  expect(mockShowToast).toHaveBeenCalledWith('Highlight saved', 'success');
});
```

### 2. Test User Behavior, Not Implementation
```typescript
// ✅ Good: Test what the user sees/does
expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();

// ❌ Bad: Test implementation details
expect(component.state.isEditing).toBe(false);
```

### 3. Async Testing with waitFor
```typescript
// Use waitFor for async updates
await waitFor(() => {
  expect(mockShowToast).toHaveBeenCalled();
});
```

### 4. Mock External Dependencies
```typescript
// Always mock API calls, localStorage, clipboard, etc.
jest.mock('../../lib/api');
global.confirm = jest.fn(() => true);
```

## Test Metrics

### Coverage Goals
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

### Current Status
- ✅ Backend: 20 tests covering all CRUD operations
- ✅ Frontend HighlightToolbar: 21 tests covering create/edit/delete
- ✅ Frontend HighlightsPanel: 16 tests covering list/edit/delete/copy
- **Total**: 57 tests

## Continuous Integration

### GitHub Actions Workflow (Recommended)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd content-queue-backend
          pip install poetry
          poetry install
      - name: Run tests
        run: |
          cd content-queue-backend
          poetry run pytest -v
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Run tests
        run: |
          cd frontend
          npm test
```

## Future Test Additions

### Integration Tests Needed
1. **End-to-End Highlight Flow**: Create → Read → Update → Delete
2. **Reader Component Integration**: Text selection → highlight creation → rendering
3. **Concurrent Highlighting**: Multiple users highlighting same content
4. **Highlight Overlaps**: Test behavior when highlights overlap in text

### Performance Tests Needed
1. **Large Content**: Highlighting in articles with 10,000+ words
2. **Many Highlights**: Rendering 100+ highlights efficiently
3. **Scroll Performance**: Panel with hundreds of highlights

### Visual Regression Tests
1. **Highlight Colors**: Verify all color options render correctly
2. **Toolbar Positioning**: Test edge cases (near viewport edges)
3. **Responsive Design**: Mobile vs desktop layouts

## Debugging Test Failures

### Common Issues

**1. "Element not found"**
```bash
# Cause: Async rendering not complete
# Fix: Use waitFor or findBy queries
await screen.findByRole('button', { name: /save/i });
```

**2. "Module not found"**
```bash
# Cause: Path aliases not configured in Jest
# Fix: Check jest.config.js moduleNameMapper
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

**3. "Cannot read property of null"**
```bash
# Cause: Component requires context provider
# Fix: Wrap in necessary providers
render(
  <ToastProvider>
    <HighlightToolbar ... />
  </ToastProvider>
);
```

## Contributing to Tests

When adding new features:
1. Write tests FIRST (TDD approach)
2. Ensure all edge cases are covered
3. Add tests to this documentation
4. Run full test suite before committing
5. Keep test files next to components or in `__tests__` directory

## Test Summary

### Complete Test Statistics

**Backend Tests:**

- Content API: 32 tests
- Lists API: 32 tests
- Highlights API: 20 tests
- **Total Backend: 84 tests**

**Frontend Tests:**

- AddContentForm: 21 tests
- ContentItem: 39 tests
- HighlightToolbar: 21 tests
- HighlightsPanel: 16 tests
- **Total Frontend: 97 tests**

**Grand Total: 181 tests**

### Feature Coverage

✅ **Content Management (32 tests)**

- URL submission and background extraction
- Listing with pagination and filters
- Read/unread status tracking
- Archiving functionality
- Tag management
- Soft deletion
- Authorization and isolation

✅ **Lists & Collections (32 tests)**

- List creation and management
- Adding/removing items
- Content counts
- Sharing settings
- Authorization and isolation

✅ **Highlights & Annotations (20 tests)**

- Creating highlights with colors and notes
- Editing existing highlights
- Deleting highlights
- Authorization and isolation

✅ **Frontend Components (97 tests)**

- URL submission form with validation
- Content item display and interactions
- Read/unread and archive operations
- Tag management
- Delete confirmations
- Add to list functionality
- Highlight toolbar (create/edit modes)
- Highlights panel with editing
- State management and user interactions
- API integration and error handling

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
