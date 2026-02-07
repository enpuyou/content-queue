from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token
from app.models.content import ContentItem
from app.models.highlight import Highlight
from app.tasks.extraction import extract_metadata

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.

    - Checks if email is already taken
    - Hashes the password
    - Saves user to database
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Hash the password
    hashed_password = get_password_hash(user_data.password)

    # Create new user
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)  # Get the auto-generated ID and timestamps

    # ---------------------------------------------------------
    # Create Default "User Guide" Article
    # ---------------------------------------------------------

    # Define the static HTML content
    guide_html = """
    <h1>Welcome to sed.i</h1>
    <p><b>sed.i</b> is your calm, personal space for reading and thinking. This guide demonstrates how to use your new content queue effectively.</p>

    <h2>1. Smart Highlighting</h2>
    <p>Reading is active. Select any text to highlight it. You can different colors to categorize your thoughts:</p>
    <ul>
        <li><b>Yellow</b> for key points</li>
        <li><b>Green</b> for actionable ideas</li>
        <li><b>Blue</b> for deep insights</li>
        <li><b>Red</b> for things to question</li>
    </ul>
    <p>Try clicking the highlight below to see a note!</p>

    <h2>2. Organization with Lists</h2>
    <p>Don't let your reading pile up. Create <b>Lists</b> to organize content by topic, project, or mood. You can find your lists in the sidebar or via the "Lists" menu on mobile.</p>

    <h2>3. Distraction-Free Reading</h2>
    <p>We strip away ads, popups, and clutter. You can customize your reading experience (font, size, theme) using the "Aa" menu in the top right.</p>

    <h3>Ready to start?</h3>
    <p>Add your first article by pasting a URL above, or install our browser extension to save content with one click.</p>
    """

    # Create the ContentItem
    guide_content = ContentItem(
        user_id=new_user.id,
        original_url="https://sed.i/welcome",  # Virtual URL
        title="Getting Started with sed.i",
        description="A quick guide to highlighting, organizing, and enjoying your new reading queue.",
        content_type="article",
        full_text=guide_html,
        reading_time_minutes=2,
        word_count=len(guide_html.split()),
        processing_status="completed",  # No extraction needed
        submitted_via="system_welcome",
    )
    db.add(guide_content)
    db.commit()
    db.refresh(guide_content)

    # ---------------------------------------------------------
    # Programmatic Highlights (Demo)
    # ---------------------------------------------------------

    # Helper to find offsets (simple string search in the HTML)
    # Note: frontend highlighting currently works on the raw text content of nodes,
    # but for simplicity here we assume the backend stores HTML and frontend renders it.
    # The HighlightRenderer matches text content.
    # FOR NOW: Let's simpler create a highlight on a specific unique phrase.

    # We'll highlight "Select any text to highlight it"
    target_phrase_1 = "Select any text to highlight it"
    start_1 = guide_html.find(target_phrase_1)

    if start_1 != -1:
        hl_1 = Highlight(
            user_id=new_user.id,
            content_item_id=guide_content.id,
            text=target_phrase_1,
            start_offset=start_1,
            end_offset=start_1 + len(target_phrase_1),
            color="yellow",
            note="Welcome to your first highlight! You can add notes like this one.",
        )
        db.add(hl_1)

    # Highlight "Create Lists"
    target_phrase_2 = "Create Lists"
    start_2 = guide_html.find(target_phrase_2)

    if start_2 != -1:
        hl_2 = Highlight(
            user_id=new_user.id,
            content_item_id=guide_content.id,
            text=target_phrase_2,
            start_offset=start_2,
            end_offset=start_2 + len(target_phrase_2),
            color="green",
            note="Pro tip: Use lists to group related research.",
        )
        db.add(hl_2)

    db.commit()

    # ---------------------------------------------------------
    # Add Example Article: TextEdit and the Relief of Simple Software
    # ---------------------------------------------------------
    example_article = ContentItem(
        user_id=new_user.id,
        original_url="https://www.newyorker.com/culture/infinite-scroll/textedit-and-the-relief-of-simple-software",
        title="TextEdit and the Relief of Simple Software",
        description="A reflection on the virtues of minimalist software and focused tools.",
        content_type="article",
        processing_status="pending",  # Will be extracted by background task
        submitted_via="system_default",
    )
    db.add(example_article)
    db.commit()
    db.refresh(example_article)

    # Trigger background extraction for the example article
    extract_metadata.delay(str(example_article.id))

    return new_user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """
    Login and get a JWT token.

    - Verifies email and password
    - Returns access token
    """
    # Find user by email
    user = db.query(User).filter(User.email == form_data.username).first()

    # Verify password
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},  # "sub" is standard JWT claim for subject (user)
        expires_delta=access_token_expires,
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get current logged-in user's information.

    This route is PROTECTED - requires valid JWT token.
    """
    return current_user
