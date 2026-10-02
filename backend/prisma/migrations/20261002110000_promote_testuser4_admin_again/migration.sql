UPDATE "User"
SET "role" = 'ADMIN',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE lower("email") = lower('testuser4@jeutaime.test');
