// 사업자 정보 — 여기 한 곳만 고치면 푸터·약관·개인정보처리방침·환불정책에 모두 반영돼요.
// 빈 칸('')은 화면에 "(준비 중)"으로 표시돼요. 토스 심사 전까지 모두 채워 주세요.
window.BIZ = {
  company: '인비너스',            // 상호
  service: '이것이 사주다',            // 서비스 이름
  ceo: '박미경',                        // 대표자
  bizNo: '494-12-02808',                      // 사업자등록번호 (000-00-00000)
  ecomNo: '',                     // 통신판매업 신고번호 (제2026-서울○○-0000호)
  address: '서울특별시 성북구 보국문로16다길 22, 103호',                    // 사업장 주소
  phone: '',                      // 고객센터 전화 (비우면 아래 안내 문구가 대신 보여요)
  phoneNote: '전화 상담은 하지 않아요. 이메일로 문의해 주세요',
  email: 'hyunstkorea@gmail.com',                      // 고객센터 이메일
  privacyOfficer: '박미경',             // 개인정보 보호책임자 (보통 대표자)
  hosting: 'Vercel Inc.',         // 호스팅서비스 제공자 (전자상거래법상 표시 의무). 서버를 옮기면 바꿔 주세요
  price: 990,                     // 상세 풀이 가격 (서버 PRICE와 같게)
  effective: '2026년 12월 1일',   // 약관 시행일
};

(function () {
  const B = window.BIZ;
  const v = k => (k === 'phone' && !B.phone) ? B.phoneNote : (B[k] === '' || B[k] == null) ? '(준비 중)' : String(B[k]);
  window.bizVal = v;
  function fill() {
    document.querySelectorAll('[data-biz]').forEach(el => {
      const k = el.dataset.biz;
      el.textContent = k === 'price' ? Number(B.price).toLocaleString() : v(k);
    });
    const f = document.getElementById('bizFooter');
    if (f) f.innerHTML = `
      <nav class="legal"><a href="/terms.html">이용약관</a><a href="/privacy.html"><b>개인정보처리방침</b></a><a href="/refund.html">환불정책</a></nav>
      <p>상호 ${v('company')} · 대표 ${v('ceo')}<br>
      사업자등록번호 ${v('bizNo')} · 통신판매업 ${v('ecomNo')}<br>
      ${v('address')}<br>
      고객센터 ${v('email')}${B.phone ? ' · ' + v('phone') : ''}<br>${B.phone ? '' : `<span>${v('phone')}</span><br>`}
      호스팅서비스 제공자 ${v('hosting')}${B.bizNo ? ` · <a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${String(B.bizNo).replace(/\D/g, '')}" target="_blank" rel="noopener">사업자정보 확인</a>` : ''}</p>`;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill); else fill();
})();
