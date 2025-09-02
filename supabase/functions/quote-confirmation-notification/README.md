# Quote Confirmation Notification Edge Function

This edge function sends an email notification to jackhoang.99@gmail.com when a customer confirms a quote.

## Functionality

When a customer confirms a quote (approves it), this function automatically:

1. Fetches the quote and job details from the database
2. Sends a formatted email notification to jackhoang.99@gmail.com
3. Includes all relevant quote and job information
4. Provides a direct link to view the job details

## Email Content

The notification email includes:

### Quote Details

- Quote Type (Repair, Replacement, PM, Inspection)
- Amount
- Quote Number
- Confirmation timestamp

### Job Information

- Job Number
- Job Name
- Customer Name
- Customer Email
- Location (if available)

### Action Button

- Direct link to view the job details in the admin panel

## Usage

This function is automatically called by the `confirm-quote` edge function when a quote is approved. It can also be called manually with:

```typescript
// Call with quote ID
fetch("/functions/v1/quote-confirmation-notification", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    quoteId: "uuid-of-quote",
  }),
});

// Or call with token
fetch("/functions/v1/quote-confirmation-notification", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    token: "quote-token",
  }),
});
```

## Environment Variables Required

- `SENDGRID_API_KEY`: SendGrid API key for sending emails
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for database access

## Email Template

The email uses a professional HTML template with:

- Airlast branding colors (#0672be)
- Responsive design
- Clear information hierarchy
- Call-to-action button
- Both HTML and plain text versions

## Error Handling

- If the notification fails to send, it logs a warning but doesn't fail the quote confirmation
- Graceful fallbacks for missing data
- Comprehensive error logging

## Integration

This function is integrated with the existing quote confirmation flow:

1. Customer confirms quote via `confirm-quote` function
2. Quote status is updated in database
3. This notification function is called automatically
4. Admin receives email notification with job details and link
