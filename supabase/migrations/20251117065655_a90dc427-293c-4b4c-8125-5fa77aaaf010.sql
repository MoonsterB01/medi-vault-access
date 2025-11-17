-- Convert all family_member users to patient role in users table
UPDATE users 
SET role = 'patient'::user_role 
WHERE role = 'family_member'::user_role;

-- Handle user_roles table (delete duplicates where user already has patient role, then update remaining)
DELETE FROM user_roles 
WHERE role = 'family_member'::user_role 
AND user_id IN (
  SELECT user_id 
  FROM user_roles 
  WHERE role = 'patient'::user_role
);

-- Update remaining family_member entries to patient
UPDATE user_roles 
SET role = 'patient'::user_role 
WHERE role = 'family_member'::user_role;