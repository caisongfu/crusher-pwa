-- =============================================
-- 修复新用户注册时初始积分为 0 的问题
-- 新用户注册赠送 100 积分，并写入交易记录
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建 profile，初始积分 100
  INSERT INTO public.profiles (id, username, role, credits)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    100
  );

  -- 写入初始积分交易记录
  INSERT INTO public.credit_transactions (user_id, amount, balance_after, type, description)
  VALUES (
    NEW.id,
    100,
    100,
    'manual_grant',
    '新用户注册赠送积分'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
