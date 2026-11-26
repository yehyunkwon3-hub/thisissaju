// 서버에서 쓰는 사주 계산 래퍼 (브라우저와 같은 엔진 사용)
const S = require('../public/js/engine.js');
S.setLunarTable(require('../public/js/lunar.js'));

// 시간 보정 방식
//  false(기본): 일반 만세력 관례 — 국내 출생은 지역과 관계없이 표준시에서 30분 보정(동경 127.5° 기준)
//  true       : 출생 지역 경도로 정밀 보정(서울 약 −32분, 부산 약 −24분)
const PRECISE_LONGITUDE = process.env.PRECISE_LONGITUDE === 'true';
const KOREA_STD_LON = 127.5;
const CITY_LON = [126.98, 126.70, 127.03, 127.73, 128.88, 127.38, 127.49, 127.29, 126.85, 127.15, 128.60, 129.08, 129.31, 128.68, 129.37, 126.53, null];

// 클라이언트 폼 값 → 검증된 계산 입력
function normalize(f) {
  const n = (v, a, b) => { v = Number(v); if (!Number.isInteger(v) || v < a || v > b) throw new Error('입력값이 올바르지 않아요'); return v; };
  const out = {
    y: n(f.y, 1920, 2059), m: n(f.m, 1, 12), d: n(f.d, 1, 31),
    h: n(f.h, -1, 23), mi: n(f.mi, 0, 59), city: n(f.city, 0, CITY_LON.length - 1),
    g: f.g === 'M' ? 'M' : 'F', cal: f.cal === 'L' ? 'L' : 'S', leap: !!f.leap && f.cal === 'L',
  };
  return out;
}
// 결제와 생년월일시를 묶는 키 (공유 링크 형식과 동일)
function birthKey(f) {
  const p = x => String(x).padStart(2, '0');
  return `${f.y}${p(f.m)}${p(f.d)}${f.h < 0 ? 'xxxx' : p(f.h) + p(f.mi)}${f.g}${f.cal === 'S' ? 'S' : f.leap ? 'Y' : 'L'}${f.city}`;
}
function calc(f) {
  return S.calc({ y: f.y, m: f.m, d: f.d, hour: f.h < 0 ? null : f.h, minute: f.mi, gender: f.g,
    lon: CITY_LON[f.city] == null ? null : (PRECISE_LONGITUDE ? CITY_LON[f.city] : KOREA_STD_LON), calendar: f.cal === 'L' ? 'lunar' : 'solar', leap: f.leap });
}
module.exports = { S, normalize, birthKey, calc };
