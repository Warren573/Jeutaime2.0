-- Keep the primary test account as a normal player account.
UPDATE "User"
SET "role" = 'USER'
WHERE lower("email") = lower('testuser4@jeutaime.test');
