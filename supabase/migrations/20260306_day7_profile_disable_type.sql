-- 添加用户禁用类型字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disable_type TEXT DEFAULT 'normal'
CHECK (disable_type IN ('normal', 'login_disabled', 'usage_disabled'));

-- 添加索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_disable_type ON profiles(disable_type);

-- 添加注释
COMMENT ON COLUMN profiles.disable_type IS '用户禁用类型: normal=正常, login_disabled=禁止登录, usage_disabled=禁止使用（可查询但无功能操作）';
