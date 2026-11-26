// 결제 승인: successUrl에서 받은 값을 검증하고 토스에 최종 승인 요청 → 열람 토큰 발급
const { normalize, birthKey } = require('../lib/saju.js');
const { sign } = require('../lib/token.js');
const { PRICE } = require('../lib/price.js');

const TOSS_CONFIRM_URL = process.env.TOSS_API_BASE ? `${process.env.TOSS_API_BASE}/v1/payments/confirm` : 'https://api.tosspayments.com/v1/payments/confirm';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'POST only' });
  const { paymentKey, orderId, amount, form, method } = req.body || {};
  let f;
  try { f = normalize(form || {}); } catch (e) { return res.status(400).json({ message: e.message }); }
  if (typeof orderId !== 'string' || !/^[A-Za-z0-9_\-=]{6,64}$/.test(orderId)) return res.status(400).json({ message: '주문번호가 올바르지 않아요' });

  // 해외카드를 별도 MID로 계약했다면 그 MID의 시크릿 키로 승인해야 해요
  const secretKey = method === 'foreign' && process.env.TOSS_INTL_SECRET_KEY ? process.env.TOSS_INTL_SECRET_KEY : process.env.TOSS_SECRET_KEY;
  // 데모 모드: 토스 키가 없으면 실제 결제 없이 토큰 발급
  if (!secretKey || !process.env.TOSS_CLIENT_KEY) {
    return res.status(200).json({ token: sign(orderId, birthKey(f)), mode: 'demo' });
  }

  // 금액 검증: 쿼리스트링 금액이 아니라 서버에 고정된 가격과 비교
  if (Number(amount) !== PRICE) return res.status(400).json({ message: '결제 금액이 일치하지 않아요' });
  if (typeof paymentKey !== 'string' || !paymentKey) return res.status(400).json({ message: 'paymentKey가 없어요' });

  try {
    const r = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount: PRICE }),
    });
    const data = await r.json().catch(() => ({}));
    // 이미 승인된 결제(새로고침 등)는 성공으로 처리
    if ((r.ok && data.status === 'DONE') || data.code === 'ALREADY_PROCESSED_PAYMENT') {
      return res.status(200).json({ token: sign(orderId, birthKey(f)), mode: 'paid', method: data.method || null });
    }
    return res.status(400).json({ message: data.message || '결제 승인에 실패했어요', code: data.code || null });
  } catch (e) {
    console.error('confirm error', e);
    return res.status(502).json({ message: '결제 서버와 통신하지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
};
