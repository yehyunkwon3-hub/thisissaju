// ===== 만세력 엔진 (자체 구현) =====
const SAJU = (() => {
  const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const STEMS_KO = ['갑','을','병','정','무','기','경','신','임','계'];
  const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const BRANCHES_KO = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
  const ANIMALS = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지'];
  const ELEMENTS = ['목','화','토','금','수'];
  const STEM_EL = [0,0,1,1,2,2,3,3,4,4];
  const BRANCH_EL = [4,2,0,0,2,1,1,2,3,3,2,4];
  const BRANCH_YIN = [0,1,0,1,0,1,0,1,0,1,0,1]; // 체 기준 단순 음양
  const BRANCH_MAIN = [9,5,0,1,4,2,3,5,6,7,4,8]; // 지장간 본기
  const D2R = Math.PI / 180;

  // ---- 천문: 태양 겉보기 황경 (Meeus 저정밀, ~0.01°) ----
  function sunLon(jdTT) {
    const T = (jdTT - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * D2R;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
    const om = (125.04 - 1934.136 * T) * D2R;
    let lon = L0 + C - 0.00569 - 0.00478 * Math.sin(om);
    return ((lon % 360) + 360) % 360;
  }
  function deltaT(year) { // 초 (근사)
    if (year >= 2005) return 64 + 0.25 * (year - 2005);
    if (year >= 1950) { const t = year - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3; }
    return 29 + 0.4 * (year - 1950);
  }
  // 목표 황경에 도달하는 UT 율리우스일 (jdGuess 근처)
  function termJD(targetLon, jdGuess) {
    let jd = jdGuess;
    for (let i = 0; i < 50; i++) {
      const y = 2000 + (jd - 2451545) / 365.25;
      const tt = jd + deltaT(y) / 86400;
      let diff = targetLon - sunLon(tt);
      diff = ((diff + 540) % 360) - 180;
      if (Math.abs(diff) < 1e-7) break;
      jd += diff * 365.2422 / 360;
    }
    return jd;
  }
  function jdFromUTC(y, m, d, h = 0, mi = 0) {
    return Date.UTC(y, m - 1, d, h, mi) / 86400000 + 2440587.5;
  }
  function jdnFromDate(y, m, d) { // 그레고리력 → JDN (정오 기준 정수)
    return Math.round(Date.UTC(y, m - 1, d) / 86400000 + 2440587.5 + 0.5);
  }
  // 그 해의 절(節) 12개 시각 (입춘=315°부터)
  const JIE_NAMES = ['입춘','경칩','청명','입하','망종','소서','입추','백로','한로','입동','대설','소한'];
  function jieOfYear(Y) { // Y년 입춘 ~ Y+1년 소한
    const res = [];
    for (let k = 0; k < 12; k++) {
      const lon = (315 + 30 * k) % 360;
      const approx = jdFromUTC(Y, 2, 4) + k * 30.44;
      res.push({ name: JIE_NAMES[k], jd: termJD(lon, approx) });
    }
    return res;
  }

  // ---- 한국 표준시 역사 + 서머타임 → UTC 오프셋(분) ----
  const DST = [
    ['1948-06-01T00','1948-09-13T00'],['1949-04-03T00','1949-09-11T00'],
    ['1950-04-01T00','1950-09-10T00'],['1951-05-06T00','1951-09-09T00'],
    ['1955-05-05T00','1955-09-09T00'],['1956-05-20T00','1956-09-30T00'],
    ['1957-05-05T00','1957-09-22T00'],['1958-05-04T00','1958-09-21T00'],
    ['1959-05-03T00','1959-09-20T00'],['1960-05-01T00','1960-09-18T00'],
    ['1987-05-10T02','1987-10-11T03'],['1988-05-08T02','1988-10-09T03'],
  ];
  function koreaOffsetMin(y, m, d, h, mi) {
    const key = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}`;
    let std = 540;
    if (key < '1912-01-01T00') std = 510;
    else if (key >= '1954-03-21T00' && key < '1961-08-10T00') std = 510;
    let dst = 0;
    for (const [a, b] of DST) if (key >= a && key < b) { dst = 60; break; }
    return { std, dst, total: std + dst };
  }

  // ---- 음력 → 양력 (내장 표) ----
  let LUNAR = null; // {base:1920, years:[{leap, lens:[...], start:jdn}]}
  function setLunarTable(t) { // {base, start0, y:[[leap,'0101..'],...]}
    let start = t.start0; const years = [];
    for (const [leap, bits] of t.y) {
      const lens = bits.split('').map(c => c === '1' ? 30 : 29);
      years.push({ leap, lens, start });
      start += lens.reduce((a, b) => a + b, 0);
    }
    LUNAR = { base: t.base, years };
  }
  function lunarToSolar(ly, lm, ld, isLeap) {
    if (!LUNAR) throw new Error('음력 표 없음');
    const Y = LUNAR.years[ly - LUNAR.base];
    if (!Y) throw new Error(`음력 ${LUNAR.base}~${LUNAR.base + LUNAR.years.length - 1}년만 지원합니다`);
    let jdn = Y.start, idx = 0;
    // months order: 1..12 with leap inserted after leap month
    const order = [];
    for (let mm = 1; mm <= 12; mm++) { order.push([mm, false]); if (Y.leap === mm) order.push([mm, true]); }
    for (let i = 0; i < order.length; i++) {
      const [mm, lp] = order[i];
      if (mm === lm && lp === !!isLeap) {
        if (ld > Y.lens[i]) throw new Error(`해당 음력 달은 ${Y.lens[i]}일까지 있습니다`);
        jdn += ld - 1; idx = -1; break;
      }
      jdn += Y.lens[i];
    }
    if (idx !== -1) throw new Error('해당 연도에 그 윤달이 없습니다');
    const ms = (jdn - 2440588) * 86400000;
    const dt = new Date(ms);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }

  const mod = (a, n) => ((a % n) + n) % n;

  function tenGod(dayStem, otherStem) {
    const de = STEM_EL[dayStem], oe = STEM_EL[otherStem];
    const same = (dayStem % 2) === (otherStem % 2);
    const rel = mod(oe - de, 5); // 0 같음,1 내가 생,2 내가 극,3 나를 극,4 나를 생
    return [['비견','겁재'],['식신','상관'],['편재','정재'],['편관','정관'],['편인','정인']][rel][same ? 0 : 1];
  }


  // ---- 오행 세력 / 신강신약 / 용신 ----
  // 지장간 (지지 속 천간) 비중
  const HIDDEN = [
    [[9,1]],                    // 子: 癸
    [[5,.6],[9,.3],[7,.1]],     // 丑: 己 癸 辛
    [[0,.6],[2,.2],[4,.2]],     // 寅: 甲 丙 戊
    [[1,.7],[0,.3]],            // 卯: 乙 甲
    [[4,.6],[1,.3],[9,.1]],     // 辰: 戊 乙 癸
    [[2,.6],[6,.2],[4,.2]],     // 巳: 丙 庚 戊
    [[3,.7],[5,.3]],            // 午: 丁 己
    [[5,.6],[3,.3],[1,.1]],     // 未: 己 丁 乙
    [[6,.6],[8,.2],[4,.2]],     // 申: 庚 壬 戊
    [[7,.7],[6,.3]],            // 酉: 辛 庚
    [[4,.6],[7,.3],[3,.1]],     // 戌: 戊 辛 丁
    [[8,.7],[0,.3]],            // 亥: 壬 甲
  ];
  const POS_W = { year: 1, month: 3, day: 1.5, hour: 1 };
  const STRONG_AT = 0.47, WEAK_AT = 0.33;
  // 오행별 세력 (천간 1, 지지는 지장간 비중 × 위치 가중치)
  function elementPower(pillars) {
    const pw = [0,0,0,0,0];
    for (const p of pillars) {
      if (p.stem === null) continue;
      pw[STEM_EL[p.stem]] += 1;
      for (const [s, w] of HIDDEN[p.branch]) pw[STEM_EL[s]] += w * POS_W[p.key];
    }
    return pw;
  }
  // 일간을 돕는 기운(비겁+인성) 비율 — 일간 자신은 제외
  function selfRatio(pw, dayStem, pillars) {
    const d = STEM_EL[dayStem], mother = mod(d - 1, 5);
    const total = pw.reduce((a, b) => a + b, 0) - 1;
    const help = pw[d] - 1 + pw[mother];
    return total > 0 ? help / total : 0.5;
  }
  // 용신 판정: 1 조후 → 2 억부 → 3 통관 → 4 결핍, 과다한 오행은 제외
  function yongsin({ power, dayStem, monthBranch, strength, strengthRatio }) {
    const tot = power.reduce((a, b) => a + b, 0);
    const share = power.map(v => v / tot);
    const d = STEM_EL[dayStem];
    const sc = [0,0,0,0,0], why = [[],[],[],[],[]];
    const add = (e, v, reason) => { sc[e] += v; if (reason && v > 0) why[e].push(reason); };
    // 1) 조후 — 계절
    const summer = [5,6,7].includes(monthBranch), winter = [11,0,1].includes(monthBranch);
    let johu = null;
    if (summer && share[4] < 0.2) {
      johu = 'hot';
      const v = share[1] >= 0.3 ? 6 : 5;
      add(4, v, 'johu'); add(3, 1);
      add(1, -2); add(0, -1);
    } else if (winter && share[1] < 0.2) {
      johu = 'cold';
      const v = share[4] >= 0.3 ? 6 : 5;
      add(1, v, 'johu'); add(0, 1);
      add(4, -2); add(3, -1);
    }
    // 2) 억부 — 일간 힘 (조후로 필요한 오행은 억부 감점에서 제외)
    const johuEl = johu === 'hot' ? 4 : johu === 'cold' ? 1 : -1;
    const sub = (e, v) => { if (e !== johuEl) sc[e] += v; };
    const mother = mod(d - 1, 5), child = mod(d + 1, 5), wealth = mod(d + 2, 5), officer = mod(d + 3, 5);
    if (strength === '신약') {
      // 관성(나를 극함)이 강하면 인성이 관을 흡수해 더 중요
      add(mother, power[officer] >= power[child] ? 4 : 3, 'eokbu');
      add(d, 2.5, 'eokbu');
      sub(child, -1); sub(wealth, -1); sub(officer, -1);
    } else if (strength === '신강') {
      if (power[mother] > power[d]) { add(wealth, 4, 'eokbu'); add(child, 2, 'eokbu'); }   // 인성 과다 → 재성
      else if (share[mother] >= 0.25) { add(child, 3.5, 'eokbu'); add(wealth, 3, 'eokbu'); add(officer, 0.5); sub(officer, -1.5); } // 비겁+인성 모두 강함 → 식상·재성 (관성은 인성을 키워 제외)
      else { add(child, 3.5, 'eokbu'); add(officer, 3, 'eokbu'); add(wealth, 1.5, 'eokbu'); } // 비겁 과다 → 식상·관성
      sub(mother, -1.5); sub(d, -1.5);
    } else {
      const low = share.indexOf(Math.min(...share));
      add(low, 1.5, 'balance');
    }
    // 3) 통관 — 서로 극하는 두 오행이 모두 강할 때 사이를 잇는 오행
    for (let a = 0; a < 5; a++) {
      const b = mod(a + 2, 5);
      if (share[a] >= 0.28 && share[b] >= 0.28) add(mod(a + 1, 5), 2.5, `tong:${a}:${b}`);
    }
    // 4) 결핍 — 아예 없는 오행
    for (let e = 0; e < 5; e++) if (power[e] === 0) add(e, 1, 'zero');
    // 과다 오행 제외
    for (let e = 0; e < 5; e++) if (share[e] >= 0.33) sc[e] -= 4;
    const order = [0,1,2,3,4].sort((x, y) => sc[y] - sc[x] || power[x] - power[y]);
    const main = order[0];
    // 희신: 용신을 생해 주는 오행(과다·감점이 아니면), 아니면 차순위
    const gen = mod(main - 1, 5);
    const rest = order.filter(e => e !== main && share[e] < 0.33);
    const hee = sc[gen] > -1 && share[gen] < 0.33 ? gen : (rest.find(e => sc[e] > 0) ?? rest[0] ?? order[1]);
    // 기신: 용신을 극하는 오행
    const gi = mod(main + 3, 5);
    return { main, hee, gi, johu, score: sc, why: why[main], share, d };
  }

  // ---- 메인 계산 ----
  // input: {y,m,d,hour|null,minute,gender:'M'|'F',lon (경도, null=보정안함), calendar:'solar'|'lunar', leap}
  function calc(input) {
    let { y, m, d } = input;
    if (input.calendar === 'lunar') ({ y, m, d } = lunarToSolar(y, m, d, input.leap));
    const hasTime = input.hour !== null && input.hour !== undefined;
    const hh = hasTime ? input.hour : 12, mi = hasTime ? (input.minute || 0) : 0;
    const off = koreaOffsetMin(y, m, d, hh, mi);
    const utcMs = Date.UTC(y, m - 1, d, hh, mi) - off.total * 60000;
    const jdUT = utcMs / 86400000 + 2440587.5;

    // 진태양시(평균태양시): UTC + 경도/15
    const useLon = input.lon != null ? input.lon : off.std / 4; // 보정 안함이면 표준 자오선
    const solarMs = utcMs + useLon * 4 * 60000;
    const sd = new Date(solarMs);
    let sy = sd.getUTCFullYear(), sm = sd.getUTCMonth() + 1, sdd = sd.getUTCDate();
    const sH = sd.getUTCHours(), sMi = sd.getUTCMinutes();

    // 년/월주: 절기 기준
    let Y = y;
    let jie = jieOfYear(Y);
    if (jdUT < jie[0].jd) { Y -= 1; jie = jieOfYear(Y); }
    let mIdx = 11;
    for (let k = 0; k < 12; k++) if (jdUT < jie[k].jd) { mIdx = k - 1; break; }
    const yearStem = mod(Y - 4, 10), yearBranch = mod(Y - 4, 12);
    const monthStem = mod(yearStem * 2 + 2 + mIdx, 10), monthBranch = mod(2 + mIdx, 12);

    // 일주: 진태양시 23시부터 다음날 (자시 기준)
    let jdn = jdnFromDate(sy, sm, sdd);
    if (hasTime && sH >= 23) jdn += 1;
    const dayIdx = mod(jdn + 49, 60);
    const dayStem = dayIdx % 10, dayBranch = dayIdx % 12;

    let hourStem = null, hourBranch = null;
    if (hasTime) {
      hourBranch = Math.floor((sH + 1) / 2) % 12;
      hourStem = mod(dayStem * 2 + hourBranch, 10);
    }

    const pillars = [
      { key: 'hour', label: '시주', stem: hourStem, branch: hourBranch },
      { key: 'day', label: '일주', stem: dayStem, branch: dayBranch },
      { key: 'month', label: '월주', stem: monthStem, branch: monthBranch },
      { key: 'year', label: '연주', stem: yearStem, branch: yearBranch },
    ];
    for (const p of pillars) {
      if (p.stem === null) continue;
      p.stemGod = p.key === 'day' ? '일간(나)' : tenGod(dayStem, p.stem);
      p.branchGod = tenGod(dayStem, BRANCH_MAIN[p.branch]);
    }

    // 오행 분포
    const elCount = [0,0,0,0,0];
    for (const p of pillars) {
      if (p.stem === null) continue;
      elCount[STEM_EL[p.stem]]++; elCount[BRANCH_EL[p.branch]]++;
    }
    // 십신 그룹 분포
    const godCount = { 비겁:0, 식상:0, 재성:0, 관성:0, 인성:0 };
    const grp = g => ({비견:'비겁',겁재:'비겁',식신:'식상',상관:'식상',편재:'재성',정재:'재성',편관:'관성',정관:'관성',편인:'인성',정인:'인성'})[g];
    for (const p of pillars) {
      if (p.stem === null) continue;
      if (p.key !== 'day') godCount[grp(p.stemGod)]++;
      godCount[grp(p.branchGod)]++;
    }
    // 신강/신약: 지장간 + 위치 가중치(월지 3, 일지 1.5)로 오행 세력 계산
    const power = elementPower(pillars);
    const strengthRatio = selfRatio(power, dayStem, pillars);
    const strength = strengthRatio >= STRONG_AT ? '신강' : strengthRatio <= WEAK_AT ? '신약' : '중화';
    const yong = yongsin({ power, dayStem, monthBranch, strength, strengthRatio });

    // 대운
    const forward = (yearStem % 2 === 0) === (input.gender === 'M');
    let targetJD;
    if (forward) {
      const all = [...jieOfYear(Y), ...jieOfYear(Y + 1)];
      targetJD = all.find(t => t.jd > jdUT).jd;
    } else {
      const all = [...jieOfYear(Y - 1), ...jieOfYear(Y)];
      targetJD = all.filter(t => t.jd <= jdUT).pop().jd;
    }
    const startAge = Math.max(1, Math.round(Math.abs(targetJD - jdUT) / 3));
    const daewoon = [];
    for (let i = 1; i <= 8; i++) {
      const s = mod(monthStem + (forward ? i : -i), 10), b = mod(monthBranch + (forward ? i : -i), 12);
      const age = startAge + (i - 1) * 10;   // 대운수는 세는 나이(한국 나이) 기준
      daewoon.push({ age, year: y + age - 1, stem: s, branch: b, stemGod: tenGod(dayStem, s), branchGod: tenGod(dayStem, BRANCH_MAIN[b]) });
    }

    return {
      solarDate: { y, m, d }, sajuYear: Y, hasTime, pillars, dayStem, dayBranch,
      elCount, godCount, strength, strengthRatio, power, yong, daewoon, forward, startAge,
      solarTime: hasTime ? `${String(sH).padStart(2,'0')}:${String(sMi).padStart(2,'0')}` : null,
      dst: off.dst > 0, stdOffset: off.std,
    };
  }

  function yearPillar(Y) { return { stem: mod(Y - 4, 10), branch: mod(Y - 4, 12) }; }

  return { STEMS, STEMS_KO, BRANCHES, BRANCHES_KO, ANIMALS, ELEMENTS, STEM_EL, BRANCH_EL, BRANCH_MAIN,
    calc, tenGod, setLunarTable, lunarToSolar, yearPillar, jieOfYear, mod };
})();
if (typeof module !== 'undefined') module.exports = SAJU;
