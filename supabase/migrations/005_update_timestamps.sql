-- =============================================
-- 自动更新 updated_at 字段的函数和触发器
-- =============================================

-- 创建更新 updated_at 的通用函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 profiles 表添加触发器
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为 documents 表添加触发器
CREATE TRIGGER trigger_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为 custom_lenses 表添加触发器
CREATE TRIGGER trigger_custom_lenses_updated_at
  BEFORE UPDATE ON custom_lenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为 feedbacks 表添加触发器
CREATE TRIGGER trigger_feedbacks_updated_at
  BEFORE UPDATE ON feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
