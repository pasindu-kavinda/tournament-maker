# Admin Setup Guide

## Quick Start

### 1. Get Your User ID

First, you need to find your user ID from Supabase:

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Users"
3. Find your user and copy the UUID

**Option B: Via SQL**
```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

### 2. Configure Admin Access

1. Copy the environment template:
   ```bash
   cp .env.template .env.local
   ```

2. Edit `.env.local` and add your user ID(s):
   ```env
   VITE_ADMIN_USER_IDS=your-user-id-here
   ```

   For multiple admins (comma-separated):
   ```env
   VITE_ADMIN_USER_IDS=uuid1,uuid2,uuid3
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

### 3. Access Admin Panel

Once configured, you'll see an **"Admin"** button in the homepage header (desktop) or mobile menu.

Click it to access: `/admin`

## Admin Features (Current)

### ✅ Implemented (Phase 1-4)
- **Admin Dashboard** - Overview with statistics
  - Total users, tournaments, matches
  - Quick action buttons
  - Active tournament count
  
- **User Management** (`/admin/users`) - Full control over users
  - List all registered users
  - Search by name, email, or ID
  - Edit user display names inline
  - View registration and last login dates
  - Real-time data updates
  
- **Tournament Management** (`/admin/tournaments`) - Complete tournament control
  - List ALL tournaments (bypasses RLS)
  - Filter by status: All, Pending, In Progress, Completed
  - Search by name, venue, creator, or ID
  - View team and match counts
  - View tournaments in spectator mode
  - Edit tournaments via standard interface
  - Delete tournaments permanently (with cascade)
  - Creator email tracking
  
- **Admin Navigation** - Protected routes
  - Dashboard (`/admin`)
  - Users (`/admin/users`)
  - Tournaments (`/admin/tournaments`)

- **Admin Badge** - Visual indicator in header
- **Mobile Support** - Admin link in mobile menu

## Next Steps

### Phase 5-8: Tournament Editor
Will implement:
- Edit tournament metadata (name, venue, date, status)
- Manage teams and members
- Reorder matches with drag-drop
- Manual final match selection

### Phase 5-8: Tournament Editor
Will implement:
- Edit tournament metadata
- Manage teams and members
- Reorder matches
- Manual final match selection

## Security Note

⚠️ **Important**: The current implementation uses environment variables for admin access control. This is **NOT secure for production** as anyone can modify the environment file.

### For Production:
We'll need to add an `is_admin` column to the database and update RLS policies. Migration script is ready in `ADMIN_IMPLEMENTATION_PLAN.md`.

## Troubleshooting

### "Admin button not showing"
- Check that your user ID is correctly added to `.env.local`
- Ensure there are no spaces around the UUID
- Restart the dev server after changing `.env.local`

### "Access denied to /admin"
- Verify `VITE_ADMIN_USER_IDS` is set correctly
- Check browser console for errors
- Try logging out and back in

## Testing

1. **As Admin User:**
   - Should see "Admin" button in header
   - Can access `/admin` route
   - Sees dashboard with stats

2. **As Regular User:**
   - No admin button visible
   - Accessing `/admin` redirects to homepage
   - No access to admin features

## Environment Variables

```env
# Supabase (required)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Admin Users (required for admin access)
VITE_ADMIN_USER_IDS=uuid1,uuid2,uuid3
```

## Current Admin Routes

- `/admin` - Dashboard (✅ Implemented)
- `/admin/users` - User management (✅ Implemented)
- `/admin/tournaments` - Tournament list (✅ Implemented)
- `/admin/tournament/:id` - Tournament editor (✅ Implemented)

## Progress

- [x] Phase 1: Admin authentication setup
- [x] Phase 2: Admin routes and navigation
- [x] Phase 3: User management
- [x] Phase 4: Tournament management
- [x] Phase 5: Tournament editor - Overview tab
- [x] Phase 6: Tournament editor - Teams tab
- [x] Phase 7: Tournament editor - Matches tab
- [x] Phase 8: Tournament editor - Final match tab
- [ ] Phase 9: Polish and testing
- [ ] Phase 10: Database migration

**Status:** Phase 1-8 Complete ✅ (Core Features Done!)
**Next:** Phase 9 - Polish & Testing (Optional)

---

For detailed implementation plan, see: `ADMIN_IMPLEMENTATION_PLAN.md`
