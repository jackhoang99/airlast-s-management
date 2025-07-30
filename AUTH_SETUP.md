# Authentication Setup Flow

## Overview

This system implements a two-step user creation and authentication process:

1. **Admin creates users** in the Settings page (no auth account yet)
2. **Users first login** triggers automatic auth account creation

## How It Works

### Step 1: Admin Creates User

- Admin goes to Settings → Users → Add User
- Fills in user details (username, email, role, etc.)
- User is created in the `users` table with **no `auth_id`**
- Admin gets success message: "User created successfully! The user can now log in..."

### Step 2: User First Login

When a user tries to log in for the first time:

1. **System checks** if user exists in `users` table
2. **If no `auth_id`**:
   - Calls `create-auth-user` edge function
   - Creates Supabase auth account with provided credentials
   - Links auth account to user record via `auth_id`
   - Signs user in automatically
3. **If `auth_id` exists**: Normal login flow

## Technical Implementation

### Edge Function: `create-auth-user`

- **Location**: `supabase/functions/create-auth-user/index.ts`
- **Purpose**: Creates Supabase auth users programmatically
- **Security**: Uses service role key for admin operations
- **Features**:
  - Validates user exists in `users` table
  - Creates auth account with auto-confirmed email
  - Links auth account to user record
  - Handles cleanup on errors

### Updated Login Pages

- **Admin Login**: `src/pages/Login.tsx`
- **Technician Login**: `src/technician-side/pages/TechnicianLogin.tsx`
- **Both now handle** the auth creation flow automatically

### Database Schema

- **`users` table** has `auth_id` column (UUID, nullable)
- **Foreign key** to `auth.users(id)`
- **Unique constraint** ensures one-to-one relationship

## User Experience

### For Admins

1. Create users normally in Settings
2. Users get immediate access (no manual auth setup needed)
3. Clear success messages guide the process

### For Users

1. Get username/password from admin
2. First login automatically sets up auth account
3. Subsequent logins work normally
4. No manual setup required

## Security Features

- **Service role key** used only in edge function
- **Email auto-confirmation** for seamless onboarding
- **Error handling** with cleanup on failures
- **Validation** ensures users exist before auth creation
- **Role-based routing** (technicians → tech portal, others → admin)

## Deployment

1. Deploy the edge function:

   ```bash
   supabase functions deploy create-auth-user
   ```

2. Ensure environment variables are set:

   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. The system is ready to use!

## Troubleshooting

### Common Issues

- **"User not found"**: User doesn't exist in `users` table
- **"Already has auth account"**: User already linked to auth
- **"Failed to create auth account"**: Check edge function logs
- **"Sign-in failed after creation"**: Try logging in again

### Debug Steps

1. Check browser console for detailed error messages
2. Verify user exists in `users` table
3. Check `auth_id` column is null for new users
4. Review edge function logs in Supabase dashboard
