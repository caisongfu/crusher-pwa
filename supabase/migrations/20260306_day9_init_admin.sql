-- supabase/migrations/20260306_day9_init_admin.sql

-- 创建管理员账户（需要在 Supabase Auth 中先创建用户，然后更新 profile）
-- 这里假设用户已存在，只需要更新 role

-- 方式 1：通过 Supabase Dashboard 创建用户，然后手动更新
-- 访问 Supabase Dashboard → Authentication → Users → Add user

-- 方式 2：使用 SQL 更新（需要用户已通过 Auth 注册）
UPDATE profiles
SET role = 'admin', credits = 10000
WHERE email = 'admin@example.com';

-- 验证管理员账户
-- SELECT email, role, credits FROM profiles WHERE role = 'admin';
