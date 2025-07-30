# GenerateQuote Component

A standalone component for generating and sending quotes that uses similar logic to the JobQuoteSection but can be used independently for manual inspection quotes.

## Overview

The `GenerateQuote` component provides a complete quote generation interface that can work with or without a job context. It includes:

- **Quote Type Tabs**: Replacement, Repair, and All Quotes
- **Data Validation**: Checks for available replacement/repair data
- **Preview Functionality**: Preview quotes before sending
- **Email Integration**: Send quotes via email with customizable templates
- **Quote History**: View all sent quotes for the job

## Location

`src/components/GenerateQuote.tsx`

## Props

### Optional Job Context

- `jobId?: string` - Job ID to use existing job data (optional)

### Manual Quote Data (when no jobId provided)

- `customerName?: string` - Customer name for manual quotes
- `customerEmail?: string` - Customer email for manual quotes
- `locationName?: string` - Location name for manual quotes
- `locationAddress?: string` - Location address for manual quotes
- `locationCity?: string` - Location city for manual quotes
- `locationState?: string` - Location state for manual quotes
- `locationZip?: string` - Location zip for manual quotes
- `unitNumber?: string` - Unit number for manual quotes

### Callbacks

- `onQuoteSent?: (quoteData: any) => void` - Callback when quote is sent
- `onPreviewQuote?: (quoteType: "replacement" | "repair") => void` - Callback for quote preview

### UI Customization

- `title?: string` - Custom title for the component (default: "Generate Quote")
- `className?: string` - Additional CSS classes

## Usage Examples

### Manual Quote (No Job Context)

```tsx
import GenerateQuote from "../components/GenerateQuote";

<GenerateQuote
  customerName="John Doe"
  customerEmail="john.doe@example.com"
  locationName="Downtown Office Building"
  locationAddress="123 Main Street"
  locationCity="Austin"
  locationState="TX"
  locationZip="78701"
  unitNumber="Suite 101"
  onQuoteSent={(quoteData) => {
    console.log("Quote sent:", quoteData);
  }}
  onPreviewQuote={(quoteType) => {
    console.log("Preview quote:", quoteType);
  }}
  title="Manual Inspection Quote"
/>;
```

### Job-Based Quote

```tsx
import GenerateQuote from "../components/GenerateQuote";

<GenerateQuote
  jobId="job-uuid-here"
  onQuoteSent={(quoteData) => {
    console.log("Quote sent:", quoteData);
  }}
  onPreviewQuote={(quoteType) => {
    console.log("Preview quote:", quoteType);
  }}
  title="Job-Based Quote"
/>;
```

## Features

### 1. Quote Type Tabs

The component provides three tabs:

- **Replacement Quote**: For equipment replacement quotes
- **Repair Quote**: For repair service quotes
- **All Quotes**: View all sent quotes for the job

### 2. Data Validation

- **Replacement Data**: Checks for available replacement data from `job_replacements` table
- **Repair Data**: Checks for available repair data from `job_items` table
- **Visual Indicators**: Shows clear status messages for data availability

### 3. Cost Calculation

- **Replacement Cost**: Automatically calculates total replacement cost with 40% gross margin
- **Repair Cost**: Calculates total repair cost from job items
- **Real-time Updates**: Costs update automatically when data changes

### 4. Email Integration

- **SendEmailModal**: Integrated email sending functionality
- **Customizable Templates**: Configurable email templates
- **PDF Generation**: Automatic PDF quote generation
- **Quote Tracking**: Tracks sent quotes in `job_quotes` table

### 5. Preview Functionality

- **Quote Preview**: Preview quotes before sending
- **PDF Generation**: Uses the `generate-quote-pdf` function to create PDFs
- **Automatic PDF Opening**: PDFs open in new window when preview is clicked
- **Template Support**: Uses quote templates from the database
- **Custom Preview Handlers**: Customizable preview behavior

## Data Flow

### With Job Context (jobId provided)

1. **Load Job Data**: Fetches job details, locations, units
2. **Load Job Items**: Fetches repair/service items
3. **Load Inspection Data**: Fetches completed inspections
4. **Load Replacement Data**: Fetches replacement recommendations
5. **Load Quote History**: Fetches previously sent quotes
6. **Calculate Costs**: Computes total costs for each quote type

### Without Job Context (manual quote)

1. **Use Provided Data**: Uses customer and location data from props
2. **Set Up Context**: Creates minimal job context for quote generation
3. **Manual Data Entry**: Allows manual entry of quote data

## Database Integration

The component integrates with several database tables:

- `jobs` - Job information
- `job_items` - Repair/service items
- `job_inspections` - Inspection data
- `job_replacements` - Replacement recommendations
- `job_quotes` - Quote history
- `locations` - Location information
- `units` - Unit information

## Email Templates

Default email template includes:

- **Subject**: "Inspection Quote from Airlast HVAC"
- **Greeting**: "Dear Customer,"
- **Intro Text**: Customizable introduction
- **Approval/Denial Buttons**: Customer action buttons
- **Cost Information**: Total cost display
- **Terms**: Approval and denial terms
- **Signature**: Company signature

## PDF Generation

The component uses the `generate-quote-pdf` function for PDF generation:

- **Template-Based**: Uses PDF templates from the `quote_templates` table
- **Dynamic Content**: Fills templates with job data, inspection data, and replacement data
- **Quote Numbering**: Automatically generates unique quote numbers
- **Background Images**: Includes company branding and background images
- **Storage**: PDFs are stored in Supabase storage and accessible via signed URLs
- **Automatic Opening**: Generated PDFs open in new browser window

### PDF Generation Process

1. **Template Selection**: Fetches default template for the quote type
2. **Data Preparation**: Prepares job data, inspection data, and replacement data
3. **API Call**: Calls the `generate-quote-pdf` function with all required data
4. **PDF Creation**: Function creates PDF with template and dynamic content
5. **Storage**: PDF is uploaded to Supabase storage
6. **URL Generation**: Signed URL is created for PDF access
7. **Display**: PDF opens in new browser window

## Styling

The component uses the same styling as the JobQuoteSection:

- **Card Layout**: Consistent card-based design
- **Tab Navigation**: Clean tab interface
- **Status Indicators**: Color-coded status messages
- **Button States**: Proper disabled/enabled states
- **Responsive Design**: Mobile-friendly layout

## Error Handling

- **Loading States**: Shows loading spinners during data fetch
- **Error Messages**: Displays error messages for failed operations
- **Data Validation**: Validates required data before sending quotes
- **Graceful Degradation**: Handles missing data gracefully

## Example Page

See `src/pages/GenerateQuotePage.tsx` for a complete example of how to use the component, including:

- Manual quote example
- Job-based quote example
- Usage instructions
- Code examples

## Integration with Existing System

The component is designed to work seamlessly with the existing quote system:

- **Same Email Modal**: Uses existing `SendEmailModal` component
- **Same PDF Generation**: Uses existing `generate-quote-pdf` function
- **Same Database Schema**: Uses existing database structure
- **Same Styling**: Consistent with existing UI components
- **Same Templates**: Uses existing quote templates from database
