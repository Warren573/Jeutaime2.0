-- Promote Warren's primary test account to administrator.
-- This preserves the user's profile, wallet, matches, letters and all game data.
UPDATE "User"
SET "role" = 'ADMIN'
WHERE lower("email") = lower('testuser4@jeutaime.test');
