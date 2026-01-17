# Admin Section Implementation Plan

## Overview
Full administrative control system for managing users, tournaments, teams, and matches without requiring database schema changes initially.

---

## Phase 1: Admin Authentication (No DB Changes)

### Approach: Environment Variable Based Admin List
**File: `.env.local`**
```env
VITE_ADMIN_USER_IDS=user-uuid-1,user-uuid-2,user-uuid-3
```

### Implementation:
1. **Create Admin Check Utility** (`src/lib/admin.ts`)
   ```typescript
   export const isAdmin = (userId: string): boolean => {
     const adminIds = import.meta.env.VITE_ADMIN_USER_IDS?.split(',') || [];
     return adminIds.includes(userId);
   };
   ```

2. **Admin Context Provider** (`src/contexts/AdminContext.tsx`)
   - Provides admin status across app
   - Wraps App component
   - Exposes `isAdmin` boolean to all components

---

## Phase 2: Admin Routes & Navigation

### New Routes in App.tsx:
```typescript
// Admin routes (protected)
<Route path="/admin" element={<AdminLayout user={user} />}>
  <Route index element={<AdminDashboard />} />
  <Route path="users" element={<UserManagement />} />
  <Route path="tournaments" element={<TournamentManagement />} />
  <Route path="tournament/:id" element={<TournamentEditor />} />
</Route>
```

### Components:
1. **AdminLayout** - Protected wrapper with admin check
2. **AdminDashboard** - Overview with stats and quick actions
3. Navigation link in HomePage/TournamentPage (visible only to admins)

---

## Phase 3: User Management

### Page: `/admin/users`
**Features:**
- List all users from `users` table
- Search/filter by name
- Edit user full_name
- View user statistics (tournaments, matches played)

### Components:
**UserManagement.tsx**
```typescript
Features:
- Data table with all users
- Search bar
- Edit name inline or modal
- View user profile link
```

### Database Operations:
```typescript
// Update user name
await supabase
  .from('users')
  .update({ full_name: newName })
  .eq('id', userId);
```

---

## Phase 4: Tournament Management

### Page: `/admin/tournaments`
**Features:**
- List ALL tournaments (not just user's own)
- Filter by status (pending, in_progress, completed)
- Search by name, venue
- Edit tournament details
- Delete tournaments
- Quick actions: View, Edit, Delete

### Components:
**TournamentManagement.tsx**
```typescript
Features:
- Data table with all tournaments
- Filters: status, date range, creator
- Actions: Edit, Delete, View
- Create new tournament (as any user)
```

### Required RLS Policy Changes:
```sql
-- Admins can view all tournaments
CREATE POLICY "Admins can view all tournaments"
  ON tournaments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- Similar for UPDATE, DELETE
```

**Note:** This requires DB change. Alternative: Use service role key in admin functions (NOT recommended for security).

**Better Alternative:** Admin operations through API route/Edge Function with proper validation.

---

## Phase 5: Tournament Editor (Most Complex)

### Page: `/admin/tournament/:id`
**Features:**
1. Edit tournament metadata (name, venue, date)
2. Manage teams
3. Manage matches
4. Fix final match selection

### Components Structure:

#### 5.1 TournamentEditor.tsx (Main Container)
```typescript
Tabs:
- Overview (edit name, date, status)
- Teams (manage team members)
- Matches (reorder, edit)
- Final Match (manual selection)
```

#### 5.2 TournamentOverviewEditor
**Features:**
- Edit tournament name
- Edit tournament venue  
- Change status (pending/in_progress/completed)
- Add/edit tournament date field (may need DB migration)
- Delete tournament

**Database:**
```typescript
await supabase
  .from('tournaments')
  .update({
    name: newName,
    venue: newVenue,
    status: newStatus,
    // created_at can be updated (tournament date)
    created_at: newDate
  })
  .eq('id', tournamentId);
```

#### 5.3 TeamMembersEditor
**Features:**
- List all teams in tournament
- Edit team name
- Add/remove team members
- Drag-drop to reorder teams
- Delete teams

**UI:**
```
Team: "Team A"
Members: 
  [Player 1] [x Remove]
  [Player 2] [x Remove]
  [+ Add Member] (dropdown of all users)
[Edit Team Name] [Delete Team]
```

**Database:**
```typescript
// Update team members
await supabase
  .from('teams')
  .update({
    name: newTeamName,
    members: [userId1, userId2, ...] // array of user IDs
  })
  .eq('id', teamId);
```

#### 5.4 MatchOrderEditor
**Features:**
- List all matches with current order
- Drag-drop to reorder matches
- Change match_number
- Edit match scores (for completed matches)
- Mark match as completed/incomplete
- Delete matches

**UI:**
```
Regular Matches:
[1] Team A vs Team B (21-19) ✓ Completed
    [Edit Score] [Mark Incomplete] [Delete]
    
[2] Team C vs Team D (Not played)
    [Enter Score] [Delete]

Drag handles to reorder matches
[Save New Order]
```

**Database:**
```typescript
// Reorder matches
for (const match of reorderedMatches) {
  await supabase
    .from('matches')
    .update({ match_number: newNumber })
    .eq('id', match.id);
}

// Update match score
await supabase
  .from('matches')
  .update({
    team1_score: score1,
    team2_score: score2,
    is_completed: true,
    winner_id: winnerId,
    point_difference: Math.abs(score1 - score2)
  })
  .eq('id', matchId);
```

#### 5.5 FinalMatchSelector
**Features:**
- View current final match
- Manually select two teams for final
- Override automatic final match selection
- Set/update final match scores

**UI:**
```
Current Final Match:
Team A vs Team B

Manual Override:
[Select Team 1: Dropdown]
[Select Team 2: Dropdown]
[Create/Update Final Match]

Score Entry:
Team 1: [__] - Team 2: [__]
[Save Score]
```

**Database:**
```typescript
// Delete existing final match
await supabase
  .from('matches')
  .delete()
  .eq('tournament_id', tournamentId)
  .eq('round', 'final');

// Create new final match
await supabase
  .from('matches')
  .insert({
    tournament_id: tournamentId,
    team1_id: selectedTeam1,
    team2_id: selectedTeam2,
    round: 'final',
    match_number: 999, // or calculate based on regular matches
    is_completed: false
  });
```

---

## Phase 6: UI/UX Considerations

### Design:
- Consistent with existing app (Tailwind + Indigo/Purple theme)
- Clear "Admin Mode" indicator
- Confirmation dialogs for destructive actions
- Loading states for all operations
- Success/error toasts
- Responsive design (mobile support)

### Icons:
- Shield/Lock for admin badge
- Edit, Delete, Save, Cancel buttons
- Drag handles for reordering

### Components to Create:
1. `AdminBadge` - Visual indicator of admin status
2. `ConfirmDialog` - Reusable confirmation modal
3. `EditableField` - Inline edit with save/cancel
4. `DragDropList` - Reorderable list component
5. `UserSelector` - Dropdown to select users
6. `TeamSelector` - Dropdown to select teams

---

## Phase 7: Security Considerations

### Current Limitations (Without DB Changes):
1. **Admin check is client-side only**
   - Users can bypass by modifying environment
   - Not secure for production

2. **RLS Policies still apply**
   - Admin can only modify their own data
   - Need to disable RLS for admin operations (risky)

### Recommended Solutions:

#### Option A: Add Admin Column (Minimal DB Change)
```sql
-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Update RLS policies to check admin status
CREATE POLICY "Admins bypass restrictions"
  ON tournaments FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM users WHERE id = auth.uid()) = true
    OR created_by = auth.uid()
  );
```

#### Option B: Edge Functions (No DB Change)
- Create Supabase Edge Function with service role key
- Admin actions proxy through Edge Function
- Function validates admin status server-side
- More complex but more secure

#### Option C: Backend API (If available)
- Admin endpoints with JWT validation
- Server-side admin check
- Proper authentication middleware

### Recommendation:
**Start with Option A (is_admin column)** - Simplest and most secure for this use case.

---

## Phase 8: Implementation Steps

### Step 1: Setup (1 hour)
1. Add `VITE_ADMIN_USER_IDS` to `.env.local`
2. Create `src/lib/admin.ts`
3. Add admin context provider
4. Update App.tsx with admin routes

### Step 2: Admin Dashboard (2 hours)
1. Create `AdminLayout` component
2. Create `AdminDashboard` with overview stats
3. Add navigation links (visible to admins only)

### Step 3: User Management (3 hours)
1. Create `UserManagement` page
2. Fetch and display all users
3. Implement name editing
4. Add search/filter

### Step 4: Tournament Management (3 hours)
1. Create `TournamentManagement` page
2. Fetch all tournaments (handle RLS)
3. Implement filters and search
4. Add delete functionality

### Step 5: Tournament Editor - Basic (4 hours)
1. Create `TournamentEditor` layout
2. Implement tabs navigation
3. Tournament overview editor
4. Save functionality

### Step 6: Team Editor (4 hours)
1. Team list display
2. Edit team names
3. Add/remove members
4. User selector dropdown

### Step 7: Match Editor (5 hours)
1. Match list display
2. Reorder functionality (drag-drop)
3. Edit scores
4. Delete matches

### Step 8: Final Match Selector (3 hours)
1. Current final display
2. Team selectors
3. Create/update final match
4. Score entry

### Step 9: Polish & Testing (4 hours)
1. Add confirmations for destructive actions
2. Error handling and toasts
3. Loading states
4. Responsive design
5. Testing all features

### Step 10: Database Migration (2 hours)
1. Add `is_admin` column
2. Update RLS policies
3. Mark initial admins
4. Test security

**Total Estimated Time: 31 hours**

---

## File Structure

```
src/
├── pages/
│   └── admin/
│       ├── AdminDashboard.tsx
│       ├── UserManagement.tsx
│       ├── TournamentManagement.tsx
│       └── TournamentEditor.tsx
├── components/
│   └── admin/
│       ├── AdminLayout.tsx
│       ├── AdminBadge.tsx
│       ├── TournamentOverviewEditor.tsx
│       ├── TeamMembersEditor.tsx
│       ├── MatchOrderEditor.tsx
│       ├── FinalMatchSelector.tsx
│       ├── EditableField.tsx
│       ├── DragDropList.tsx
│       ├── UserSelector.tsx
│       └── ConfirmDialog.tsx
├── lib/
│   └── admin.ts
├── contexts/
│   └── AdminContext.tsx
└── types/
    └── admin.ts (if needed)

supabase/
└── migrations/
    └── [timestamp]_add_admin_support.sql
```

---

## Database Migration (Final Phase)

### Migration File: `add_admin_support.sql`

```sql
-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

-- Update RLS policies for tournaments
DROP POLICY IF EXISTS "Users can view their own tournaments" ON tournaments;
CREATE POLICY "Users can view tournaments"
  ON tournaments FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR (SELECT is_admin FROM users WHERE id = auth.uid()) = true
  );

DROP POLICY IF EXISTS "Users can update their own tournaments" ON tournaments;
CREATE POLICY "Users can update tournaments"
  ON tournaments FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR (SELECT is_admin FROM users WHERE id = auth.uid()) = true
  );

-- Add admin delete policy
CREATE POLICY "Admins can delete tournaments"
  ON tournaments FOR DELETE
  TO authenticated
  USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

-- Similar updates for teams table
CREATE POLICY "Admins can manage all teams"
  ON teams FOR ALL
  TO authenticated
  USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

-- Similar updates for matches table
CREATE POLICY "Admins can manage all matches"
  ON matches FOR ALL
  TO authenticated
  USING ((SELECT is_admin FROM users WHERE id = auth.uid()) = true);

-- Mark initial admin users (replace with actual user IDs)
-- UPDATE users SET is_admin = true WHERE id IN ('uuid1', 'uuid2');
```

---

## Testing Checklist

### User Management:
- [ ] View all users
- [ ] Search users
- [ ] Edit user name
- [ ] Changes reflect immediately
- [ ] Error handling works

### Tournament Management:
- [ ] View all tournaments
- [ ] Filter by status
- [ ] Search tournaments
- [ ] Delete tournament
- [ ] Confirmation dialog works

### Tournament Editor:
- [ ] Edit tournament name
- [ ] Edit tournament venue
- [ ] Change tournament status
- [ ] Changes save correctly

### Team Management:
- [ ] View all teams
- [ ] Edit team name
- [ ] Add team member
- [ ] Remove team member
- [ ] Delete team
- [ ] Validation works

### Match Management:
- [ ] View all matches in order
- [ ] Reorder matches
- [ ] Edit match scores
- [ ] Mark as completed/incomplete
- [ ] Delete match
- [ ] Order persists after reload

### Final Match:
- [ ] View current final
- [ ] Select custom teams
- [ ] Create new final
- [ ] Update final scores
- [ ] Delete and recreate final

### Security:
- [ ] Non-admins cannot access admin routes
- [ ] Non-admins cannot see admin links
- [ ] Admin operations fail for non-admins
- [ ] RLS policies work correctly

---

## Future Enhancements

1. **Activity Log**
   - Track all admin actions
   - Show who changed what and when

2. **Bulk Operations**
   - Bulk delete matches
   - Bulk update team members
   - Import/export tournaments

3. **Advanced Analytics**
   - Admin dashboard with charts
   - User activity tracking
   - Tournament performance metrics

4. **Email Notifications**
   - Notify users of changes
   - Tournament updates
   - Match schedules

5. **Audit Trail**
   - Complete history of changes
   - Rollback functionality
   - Change comparison

---

## Notes

1. **Start Simple**: Begin with environment variable approach, migrate to DB column when ready
2. **Incremental**: Build one section at a time, test thoroughly
3. **Security First**: Always validate admin status on backend operations
4. **User Experience**: Add plenty of confirmations for destructive actions
5. **Documentation**: Keep this plan updated as implementation progresses

---

## Questions to Resolve

1. Should tournament date be `created_at` or new `tournament_date` field?
2. Which users should be initial admins?
3. Should admins be able to create tournaments as other users?
4. Should there be super-admin vs regular admin roles?
5. What happens to existing RLS when admin policies are added?

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Decide on admin authentication approach**
3. **Start with Phase 1 & 2** (admin setup and routes)
4. **Build incrementally** following the phases
5. **Test each feature** before moving to next
6. **Deploy admin column migration** when ready

---

**Priority: HIGH**
**Estimated Completion: 2-3 weeks** (depending on availability)
**Complexity: MEDIUM-HIGH**
