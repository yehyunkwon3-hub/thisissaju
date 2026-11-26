// 브라우저에 공개해도 되는 설정만 내려줘요 (시크릿 키는 절대 X)
const { PRICE } = require('../lib/price.js');
module.exports = (req, res) => {
  const clientKey = process.env.TOSS_CLIENT_KEY || '';
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    clientKey,
    price: PRICE,
    payMode: clientKey && process.env.TOSS_SECRET_KEY ? (clientKey.startsWith('test_') ? 'test' : 'live') : 'demo',
    ai: !!process.env.ANTHROPIC_API_KEY,
    kakaoKey: process.env.KAKAO_JS_KEY || '',
    preciseLongitude: process.env.PRECISE_LONGITUDE === 'true',
    // 결제 수단 표시 (계약된 것만 남기세요): card, easypay, transfer, foreign
    methods: (process.env.PAY_METHODS || 'card,easypay,transfer,foreign').split(',').map(s => s.trim()).filter(Boolean),
    // 간편결제 목록: KAKAOPAY, NAVERPAY, TOSSPAY
    easyPays: (process.env.EASY_PAYS || 'KAKAOPAY,NAVERPAY,TOSSPAY').split(',').map(s => s.trim()).filter(Boolean),
    // 해외카드가 별도 상점아이디(MID)면 그 클라이언트 키
    intlClientKey: process.env.TOSS_INTL_CLIENT_KEY || '',
  });
};
