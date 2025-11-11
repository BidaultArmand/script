# Setup Guide: Audio Transcription & Summary App

This guide will help you set up and run the audio transcription and summarization app with user preferences and resume storage.

## Prerequisites

- Supabase account and project
- OpenAI API key
- Python 3.13+ with pip
- Node.js 16+ with npm
- ffmpeg installed on your system

## Step 1: Database Setup

You need to run the SQL migrations in your Supabase dashboard to create the necessary tables.

### Running Migrations

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the following migration files in order:

#### Migration 1: Create Summaries Table

Open `backend/migrations/001_create_summaries_table.sql` and execute it in the SQL Editor.

This creates:
- `summaries` table to store meeting summaries
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for auto-updating timestamps

#### Migration 2: Create User Preferences Table

Open `backend/migrations/002_create_user_preferences_table.sql` and execute it in the SQL Editor.

This creates:
- `user_preferences` table to store user default preferences
- RLS policies for user isolation
- Triggers for timestamp management

### Verify Tables

After running migrations, verify the tables exist:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('summaries', 'user_preferences');
```

You should see both tables listed.

## Step 2: Environment Variables

### Backend (.env)

Ensure your `backend/.env` file contains:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key
```

### Frontend (.env.local)

Ensure your `frontend-app/.env.local` file contains:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Step 3: Start the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt  # if you have one, or install manually

# Start the server
./run.sh
# Or manually: uvicorn app.main:app --reload
```

Backend should be running on `http://localhost:8000`

## Step 4: Start the Frontend

```bash
cd frontend-app
npm install
npm run dev
```

Frontend should be running on `http://localhost:3000`

## Step 5: Test the Application

### 1. Create an Account
- Navigate to `http://localhost:3000`
- Click "Sign Up" and create a new account
- You'll be redirected to the dashboard

### 2. Configure Preferences (Optional)
- Click the "Preferences" button in the header
- Configure your default summary preferences:
  - **Format**: Structured, Bullet Points, Paragraph, or Action Items Only
  - **Language**: English or French
  - **Detail Level**: Brief, Medium, or Detailed
  - **Auto-generate**: Enable/disable automatic summary generation after transcription
  - **Other options**: Timestamps, Action Items, Decisions
- Click "Save Preferences"

### 3. Upload Audio and Generate Summary
- Drag and drop an audio file or click "Browse" to select one
- Supported formats: mp3, m4a, wav, etc.
- Click "Lancer la transcription" (Start Transcription)
- Wait for:
  1. Audio upload
  2. Transcription (using Whisper)
  3. Automatic summary generation (if enabled in preferences)
- You should see "Transcription et résumé terminés ✅" when complete

### 4. View Your Summaries
- Scroll down to the "Your Summaries" section
- Click on any summary card to view the full text
- You can copy summaries to clipboard
- Each summary shows:
  - Title (from audio filename)
  - Creation date/time
  - Format used
  - Language
  - Detail level
  - Generation time

## Features

### Automatic Summary Generation
After transcription completes, the system automatically:
1. Fetches your user preferences
2. Generates a summary using GPT-4o-mini
3. Saves the summary to the database
4. Displays it in your library

### User Preferences
Your preferences control:
- Summary format (structured sections, bullets, paragraphs, action items)
- Language (EN/FR with full localization)
- Detail level (brief, medium, detailed)
- Auto-generation toggle
- Content inclusion (timestamps, action items, decisions)

### Resumes Library
- View all your summaries in one place
- Organized by date (newest first)
- Quick preview with full details on click
- Copy to clipboard functionality
- Persistent storage in Supabase

## API Endpoints

### Backend Endpoints

- `POST /transcribe` - Upload audio and transcribe
- `POST /summarize` - Generate summary for a meeting
- `GET /summaries` - Get all user summaries
- `GET /summaries/{id}` - Get specific summary
- `GET /preferences` - Get user preferences (creates defaults if not exists)
- `POST /preferences` - Update user preferences

### Authentication

All endpoints require Bearer token authentication:
```
Authorization: Bearer {supabase_access_token}
```

## Database Schema

### summaries table
- `id` (UUID) - Primary key
- `meeting_id` (UUID) - Reference to meetings table
- `user_id` (UUID) - User who owns the summary
- `transcript_id` (UUID) - Reference to transcripts table
- `title` (TEXT) - Summary title
- `summary_text` (TEXT) - Generated summary content
- `format` (VARCHAR) - Format used: structured, bullet_points, paragraph, action_items
- `language` (VARCHAR) - Language: en, fr, etc.
- `detail_level` (VARCHAR) - Detail level: brief, medium, detailed
- `model_used` (VARCHAR) - AI model used: gpt-4o-mini
- `generation_time_seconds` (FLOAT) - Time taken to generate
- `created_at`, `updated_at` - Timestamps

### user_preferences table
- `id` (UUID) - Primary key
- `user_id` (UUID) - User (unique)
- `default_format` (VARCHAR) - Default format preference
- `default_language` (VARCHAR) - Default language preference
- `default_detail_level` (VARCHAR) - Default detail level
- `auto_generate_summary` (BOOLEAN) - Auto-generate after transcription
- `include_timestamps` (BOOLEAN) - Include timestamps in summaries
- `include_action_items` (BOOLEAN) - Extract action items
- `include_decisions` (BOOLEAN) - Extract key decisions
- `created_at`, `updated_at` - Timestamps

## Troubleshooting

### CORS Issues
If you get CORS errors, ensure:
- Backend CORS middleware is configured with frontend URL
- Frontend is using correct API base URL

### Database Errors
If you get database errors:
- Verify migrations ran successfully
- Check RLS policies are enabled
- Ensure JWT_SECRET matches between backend and Supabase

### Summary Not Generated
If summary doesn't auto-generate:
- Check user preferences - `auto_generate_summary` should be `true`
- Verify OPENAI_API_KEY is set in backend .env
- Check backend logs for errors

### Can't See Summaries
If summaries don't appear:
- Verify you're logged in
- Check browser console for errors
- Ensure RLS policies allow user to read their own summaries
- Try clicking "Refresh" button

## Next Steps

Potential enhancements:
- Export summaries to PDF/DOCX
- Share summaries with other users
- Schedule recurring transcriptions
- Add more languages
- Customize summary templates
- Integration with calendar apps
- Search and filter summaries
- Tags and categories

## Support

If you encounter issues:
1. Check backend logs: Terminal where uvicorn is running
2. Check frontend logs: Browser console (F12)
3. Check Supabase logs: Supabase dashboard > Logs
4. Verify all environment variables are set correctly
5. Ensure all dependencies are installed

Happy transcribing and summarizing!
