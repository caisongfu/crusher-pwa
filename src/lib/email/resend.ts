/**
 * Resend 邮件服务
 *
 * 提供统一的邮件发送接口，支持发送事务性邮件和营销邮件
 */

import { Resend } from 'resend';

// 从环境变量获取 API Key
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('⚠️  RESEND_API_KEY 未配置，邮件功能将被禁用');
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * 邮件发送选项
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * 发送邮件
 *
 * @param options 邮件发送选项
 * @returns 发送结果
 */
export async function sendEmail(options: SendEmailOptions) {
  if (!resend) {
    console.warn('邮件服务未启用，跳过发送:', options.subject);
    return { success: false, error: '邮件服务未配置' };
  }

  try {
    const { to, subject, html, text, from } = options;

    // 默认发件人
    const defaultFrom = process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com';

    const emailData: any = {
      from: from || defaultFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || undefined,
      text: text || undefined,
    };

    // 只在有值时添加 replyTo
    if (options.replyTo) {
      emailData.reply_to = options.replyTo;
    }

    const result = await resend.emails.send(emailData);

    console.log('✅ 邮件发送成功:', result.data?.id);

    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ 邮件发送失败:', error);
    return { success: false, error };
  }
}

/**
 * 退款审批通知邮件
 *
 * @param userEmail 用户邮箱
 * @param orderId 订单ID
 * @param packageName 套餐名称
 * @param refundAmount 退款金额（积分）
 * @param isApproved 是否批准
 * @param rejectionReason 拒绝原因（可选）
 */
export async function sendRefundNotification(
  userEmail: string,
  orderId: string,
  packageName: string,
  refundAmount: number,
  isApproved: boolean,
  rejectionReason?: string
) {
  const subject = isApproved
    ? '退款已批准 - 碎石记'
    : '退款申请已拒绝 - 碎石记';

  const html = isApproved
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">退款已批准</h2>
        <p>尊敬的用户：</p>
        <p>您的退款申请已经审批通过。</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>订单信息：</strong>${orderId}</p>
          <p><strong>套餐名称：</strong>${packageName}</p>
          <p><strong>退款积分：</strong>${refundAmount}</p>
        </div>
        <p>退款积分已自动回退到您的账户，您可以在个人中心查看积分余额。</p>
        <p>如有疑问，请联系客服。</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          此邮件为系统自动发送，请勿回复。<br/>
          碎石记 - AI 文档分析平台
        </p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f44336;">退款申请已拒绝</h2>
        <p>尊敬的用户：</p>
        <p>很遗憾，您的退款申请未通过审批。</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>订单信息：</strong>${orderId}</p>
          <p><strong>套餐名称：</strong>${packageName}</p>
          <p><strong>拒绝原因：</strong>${rejectionReason || '未提供原因'}</p>
        </div>
        <p>如对此决定有疑问，请联系客服说明情况。</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          此邮件为系统自动发送，请勿回复。<br/>
          碎石记 - AI 文档分析平台
        </p>
      </div>
    `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
  });
}

/**
 * 订单支付成功通知邮件
 *
 * @param userEmail 用户邮箱
 * @param packageName 套餐名称
 * @param credits 获得的积分
 * @param amount 支付金额（元）
 */
export async function sendPaymentSuccessNotification(
  userEmail: string,
  packageName: string,
  credits: number,
  amount: number
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">支付成功</h2>
      <p>尊敬的用户：</p>
      <p>您的订单支付成功！</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>套餐名称：</strong>${packageName}</p>
        <p><strong>支付金额：</strong>¥${amount.toFixed(2)}</p>
        <p><strong>获得积分：</strong>${credits}</p>
      </div>
      <p>积分已自动充值到您的账户，您现在可以使用积分进行文档分析了。</p>
      <p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/documents" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          开始使用
        </a>
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        此邮件为系统自动发送，请勿回复。<br/>
        碎石记 - AI 文档分析平台
      </p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: '支付成功 - 碎石记',
    html,
  });
}

/**
 * 欢迎邮件
 *
 * @param userEmail 用户邮箱
 * @param username 用户名（可选）
 */
export async function sendWelcomeEmail(userEmail: string, username?: string) {
  const displayName = username || '用户';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2196F3;">欢迎使用碎石记</h2>
      <p>尊敬的 ${displayName}：</p>
      <p>欢迎注册碎石记！我们很高兴您加入了我们。</p>
      <p>碎石记是一款基于 AI 的文档分析平台，可以帮助您：</p>
      <ul style="line-height: 2;">
        <li>📝 智能分析文档内容</li>
        <li>🔍 使用多种透镜深入洞察</li>
        <li>📊 生成结构化报告</li>
        <li>🚀 提升工作效率</li>
      </ul>
      <p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/capture" style="background: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          开始体验
        </a>
      </p>
      <p>如有任何问题，请随时联系我们。</p>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        此邮件为系统自动发送，请勿回复。<br/>
        碎石记 - AI 文档分析平台
      </p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: '欢迎加入碎石记',
    html,
  });
}

export default {
  sendEmail,
  sendRefundNotification,
  sendPaymentSuccessNotification,
  sendWelcomeEmail,
};
