# Reminder Components

This document describes the new reusable reminder components that have been added to the application.

## Components

### 1. AddReminderButton

A reusable button component for adding reminders to specific jobs.

**Location:** `src/components/AddReminderButton.tsx`

**Props:**

- `jobId` (string, required): The ID of the job to create a reminder for
- `jobTechnicians` (array, optional): Array of technicians assigned to the job
- `onReminderSent` (function, optional): Callback function called when a reminder is successfully sent
- `variant` (string, optional): Button variant - "primary", "secondary", or "outline" (default: "primary")
- `size` (string, optional): Button size - "sm", "md", or "lg" (default: "md")
- `showIcon` (boolean, optional): Whether to show the plus icon (default: true)
- `className` (string, optional): Additional CSS classes
- `children` (ReactNode, optional): Custom button content

**Usage:**

```tsx
import AddReminderButton from "../components/AddReminderButton";

<AddReminderButton
  jobId="job-123"
  jobTechnicians={jobTechnicians}
  onReminderSent={() => refreshReminders()}
  variant="primary"
  size="sm"
/>;
```

### 2. AdminAddReminderButton

A specialized button component for creating admin reminders (not tied to specific jobs). This component uses the same `ReminderModal` as job reminders but with admin-specific defaults.

**Location:** `src/components/AdminAddReminderButton.tsx`

**Props:**

- `onReminderSent` (function, optional): Callback function called when a reminder is successfully sent
- `variant` (string, optional): Button variant - "primary", "secondary", or "outline" (default: "primary")
- `size` (string, optional): Button size - "sm", "md", or "lg" (default: "md")
- `showIcon` (boolean, optional): Whether to show the plus icon (default: true)
- `className` (string, optional): Additional CSS classes
- `children` (ReactNode, optional): Custom button content

**Usage:**

```tsx
import AdminAddReminderButton from "../components/AdminAddReminderButton";

<AdminAddReminderButton
  onReminderSent={() => refreshAdminReminders()}
  variant="primary"
  size="sm"
/>;
```

**Features:**
- Uses the same modal interface as job reminders for consistency
- Automatically fetches all active technicians for selection
- Provides admin-specific default subject and message text
- Supports both email and in-app notifications
- Allows scheduling for immediate or future delivery

## Integration

### AdminReminders Component

The `AdminReminders` component has been updated to include the `AdminAddReminderButton` in its header. This allows administrators to create general admin reminders directly from the admin reminders section.

### JobReminderList Component

The `JobReminderList` component has been refactored to use the `AddReminderButton` component instead of its own inline reminder modal. This provides a consistent user experience across the application.

## Features

Both components provide:

1. **Consistent UI**: Same button styling and behavior across the application
2. **Modal Integration**: Built-in reminder creation modal with form validation
3. **Flexible Configuration**: Customizable button appearance and behavior
4. **Callback Support**: Refresh functions called after successful reminder creation
5. **Error Handling**: Proper error states and user feedback
6. **Loading States**: Visual feedback during reminder creation

## Reminder Types

The components support two types of reminders:

1. **Email Reminders**: Sent via email to specified recipients
2. **In-App Notifications**: Displayed within the application interface

## Recipients

- **Job-specific reminders**: Can be sent to technicians assigned to the job or custom email addresses
- **Admin reminders**: Can be sent to admin users (in-app) or custom email addresses

## Scheduling

Reminders can be:

- **Sent immediately**: Delivered right away
- **Scheduled for later**: Set to be sent at a specific date and time
