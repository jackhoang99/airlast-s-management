# Send Google Calendar Invite Edge Function

This edge function creates Google Calendar events programmatically and sends invitations to selected attendees.

## Setup Requirements

### 1. Google Calendar API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create credentials (OAuth 2.0 Client ID)
5. Set up a service account or use OAuth 2.0 with refresh tokens

### 2. Environment Variables

Add the following environment variables to your Supabase project:

```bash
# Google Calendar API Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
```

### 3. Getting a Refresh Token

To get a refresh token for the Google Calendar API:

1. Use the Google OAuth 2.0 Playground: https://developers.google.com/oauthplayground/
2. Select the Google Calendar API v3 scope: `https://www.googleapis.com/auth/calendar`
3. Authorize and exchange the authorization code for tokens
4. Use the refresh token in your environment variables

### 4. Deploy the Function

```bash
supabase functions deploy send-google-calendar-invite
```

## Usage

The function expects a POST request with the following structure:

```typescript
{
  jobData: {
    address: string;
    jobType: string;
    description: string;
    problemDescription: string;
    startDate: string;
    dueDate: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    unitInfo?: string;
    companyName?: string;
    locationName?: string;
  };
  selectedTechnicians: Array<{
    id: string;
    name: string;
    email: string;
    scheduledTime?: string;
  }>;
  selectedAttendees: string[];
  adminEmails: Array<{
    name: string;
    email: string;
  }>;
}
```

## Response

The function returns:

```typescript
{
  success: boolean;
  eventId?: string;
  eventLink?: string;
  message: string;
  error?: string;
}
```

## Features

- Creates Google Calendar events with proper formatting
- Sends invitations to selected attendees
- Includes job details, technician schedules, and contact information
- Handles timezone conversion (currently set to America/New_York)
- Provides detailed error handling and logging

## Security

- Uses OAuth 2.0 with refresh tokens for secure API access
- Validates all input data
- Implements proper error handling
- CORS headers for cross-origin requests
