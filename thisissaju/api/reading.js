// 상세 풀이: 열람 토큰 검증 → 서버에서 사주 계산 → AI(있으면) 또는 규칙 기반 풀이 반환
const { normalize, birthKey, calc } = require('../lib/saju.js');
const { verify } = require('../lib/token.js');
const { buildPaid } = require('../lib/paid.js');
const { aiReading } = require('../lib/ai.js');

function nowYearKST() { return new Date(Date.now() + 9 * 3600e3).getUTCFullYear(); }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'POST only' });
  const { orderId, token, form, name } = req.body || {};
  let f;
  try { f = normalize(form || {}); } catch (e) { return res.status(400).json({ message: e.message }); }
  if (!verify(orderId, birthKey(f), token)) return res.status(403).json({ message: '결제 정보를 확인할 수 없어요' });

  let r;
  try { r = calc(f); } catch (e) { return res.status(400).json({ message: e.message }); }
  const safeName = typeof name === 'string' ? name.replace(/[^\p{L}\p{N} ]/gu, '').slice(0, 10).trim() : '';
  const draft = buildPaid(r, f.g, nowYearKST(), safeName);
  const ai = await aiReading(r, f.g, safeName, draft);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    v: 2,
    sections: (ai || draft).sections.map(({ id, icon, title, headline, paras, items }) => ({ id, icon, title, headline, paras, items })),
    source: ai ? (ai.aiCount === draft.sections.length - 1 ? 'ai' : 'mixed') : 'rules',
  });
};
