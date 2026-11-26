// 결제 완료 → 열람 토큰 (DB 없이 HMAC 서명으로 검증)
const crypto = require('crypto');

function secret() {
  const s = process.env.TOKEN_SECRET;
  if (!s || s.length < 16) throw new Error('TOKEN_SECRET 환경변수(16자 이상)가 필요해요');
  return s;
}
function sign(orderId, birthKey) {
  return crypto.createHmac('sha256', secret()).update(`${orderId}|${birthKey}`).digest('base64url');
}
function verify(orderId, birthKey, token) {
  if (typeof token !== 'string' || typeof orderId !== 'string') return false;
  const a = Buffer.from(sign(orderId, birthKey)), b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
module.exports = { sign, verify };
