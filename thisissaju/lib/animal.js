// 행운 동물 추천 — 용신·희신을 기준으로, 원국 지지와의 합·충·형·파·해, 천을귀인, 공망, 조후를 점수화
// 가중치는 W 한곳에서 조정해요.
const { S } = require('./saju.js');
const TXT = require('../public/js/content-free.js');

const W = {
  yong: 3, hee: 1.5, excess: -3, gi: -1.5,
  gwiin: 2, gwiinExcess: 1,
  samhapYong: 3, samhapHee: 2, samhapBad: -3, weakHapFactor: 0.5,
  yukhapYong: 2, yukhapHee: 1.5, yukhapNeutral: 0.5, yukhapBad: -2, notDayFactor: 0.75,
  banghapYong: 2, banghapHee: 1.5, banghapBad: -3,
  chungDay: -4, chung: -2, hyungDay: -2, hyung: -1.5, pa: -1, hae: -1, gongmang: -1,
  johuGood: 1, johuBad: -1,
  hiddenNeed: 1, hiddenNeedMin: 0.2, scarceShare: 0.08,
  closeMargin: 0.5,   // 1위가 용신 동물이 아니고 용신 동물과 이 점수 차 이내면 용신 동물을 1순위로, 원래 1위는 2순위로
};

const ANIMAL = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지'];
const EMOJI = ['🐭','🐮','🐯','🐰','🐲','🐍','🐴','🐑','🐵','🐔','🐶','🐷'];
const BK = S.BRANCHES_KO, BH = S.BRANCHES, EL = S.ELEMENTS;
const GWIIN = { 0: [1,7], 4: [1,7], 6: [1,7], 1: [0,8], 5: [0,8], 2: [11,9], 3: [11,9], 7: [2,6], 8: [5,3], 9: [5,3] };
const SAMHAP = [[[8,0,4],4],[[2,6,10],1],[[5,9,1],3],[[11,3,7],0]];   // [구성, 결과 오행]
const WANG = [0,3,6,9];                                               // 왕지(자오묘유)
const YUKHAP = [[0,1,2],[2,11,0],[3,10,1],[4,9,3],[5,8,4],[6,7,1]];   // [a,b,합화 오행]
const BANGHAP = [[[2,3,4],0],[[5,6,7],1],[[8,9,10],3],[[11,0,1],4]];
const HYUNG = [[0,3],[2,5],[5,8],[2,8],[1,10],[10,7],[1,7],[4,4],[6,6],[9,9],[11,11]];
const PA = [[0,9],[6,3],[8,5],[2,11],[4,1],[10,7]];
const HAE = [[0,7],[1,6],[2,5],[3,4],[8,11],[9,10]];
const pairIn = (list, a, b) => list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const HIDDEN = [[[9,1]],[[5,.6],[9,.3],[7,.1]],[[0,.6],[2,.2],[4,.2]],[[1,.7],[0,.3]],[[4,.6],[1,.3],[9,.1]],[[2,.6],[6,.2],[4,.2]],[[3,.7],[5,.3]],[[5,.6],[3,.3],[1,.1]],[[6,.6],[8,.2],[4,.2]],[[7,.7],[6,.3]],[[4,.6],[7,.3],[3,.1]],[[8,.7],[0,.3]]];
const POS = { year: '연지', month: '월지', day: '일지', hour: '시지' };
const jo = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c % 28 ? a : b); };
const wa = w => jo(w, '과', '와');
const iga = w => jo(w, '이', '가');
const POSN = { year: '태어난 해의', month: '태어난 달의', day: '태어난 날의', hour: '태어난 시의' };

function luckyAnimals(r) {
  const y = r.yong, share = y.share;
  const chart = r.pillars.filter(p => p.branch !== null).map(p => ({ key: p.key, b: p.branch }));
  const present = new Set(chart.map(c => c.b));
  // 일공망
  const idx = [...Array(60).keys()].find(i => i % 10 === r.dayStem && i % 12 === r.dayBranch);
  const xunStartB = (idx - (idx % 10)) % 12;
  const gong = [(xunStartB + 10) % 12, (xunStartB + 11) % 12];
  const isExcess = e => share[e] >= 0.33;
  const goodness = e => e === y.main ? 'yong' : e === y.hee ? 'hee' : (isExcess(e) || e === y.gi) ? 'bad' : 'neutral';
  const elH = e => `${EL[e]}(${'木火土金水'[e]})`;

  const out = [];
  for (let b = 0; b < 12; b++) {
    let sc = 0; const plus = [], minus = [];
    const P = (v, t) => { sc += v; if (t) plus.push(t); };
    const M = (v, t) => { sc += v; if (t) minus.push(t); };
    const e = S.BRANCH_EL[b];
    // 오행 자체
    if (e === y.main) P(W.yong, `가장 필요한 ${elH(e)} 기운`);
    else if (e === y.hee) P(W.hee, `함께 챙길 ${elH(e)} 기운`);
    if (isExcess(e)) M(W.excess, `이미 넘치는 ${elH(e)} 기운`);
    else if (e === y.gi) M(W.gi, `필요한 기운을 누르는 ${elH(e)} 기운`);
    // 지장간 보충: 원국에 거의 없는 용신·희신 오행을 속에 품은 글자
    for (const [s, w] of HIDDEN[b]) {
      const he = S.STEM_EL[s];
      if (he === e || w < W.hiddenNeedMin || share[he] >= W.scarceShare) continue;
      if (he === y.main || he === y.hee) P(W.hiddenNeed, `속에 부족한 ${EL[he]}(${'木火土金水'[he]}) 기운을 품음`);
    }
    // 천을귀인
    if (GWIIN[r.dayStem].includes(b)) P(isExcess(e) ? W.gwiinExcess : W.gwiin, '귀인의 기운');
    // 삼합·반합
    for (const [grp, res] of SAMHAP) {
      if (!grp.includes(b)) continue;
      const others = [...new Set(grp.filter(x => x !== b && present.has(x)))];
      if (!others.length) continue;
      const full = others.length === 2;
      const strong = full || WANG.includes(b) || others.some(o => WANG.includes(o));
      const f = strong ? 1 : W.weakHapFactor;
      const g = goodness(res);
      const label = g === 'bad' ? `사주 속 ${wa(others.map(o => ANIMAL[o]).join('·'))} 만나 ${elH(res)} 기운이 더 커져요` : `사주 속 ${wa(others.map(o => ANIMAL[o]).join('·'))} 만나 ${elH(res)} 기운으로 뭉쳐요`;
      if (g === 'yong') P(W.samhapYong * f, label);
      else if (g === 'hee') P(W.samhapHee * f, label);
      else if (g === 'bad') M(W.samhapBad * f, label);
    }
    // 육합
    for (const c of chart) {
      const h = YUKHAP.find(([a, bb]) => (a === b && bb === c.b) || (bb === b && a === c.b));
      if (!h) continue;
      const f = c.key === 'day' ? 1 : W.notDayFactor, g = goodness(h[2]);
      const label = `${POSN[c.key]} ${wa(ANIMAL[c.b])} 짝을 이뤄 ${elH(h[2])} 기운이 돼요`;
      if (g === 'yong') P(W.yukhapYong * f, label);
      else if (g === 'hee') P(W.yukhapHee * f, label);
      else if (g === 'bad') M(W.yukhapBad * f, label);
      else P(W.yukhapNeutral * f, label);
    }
    // 방합 (원국에 나머지 두 글자가 있을 때 완성)
    for (const [grp, res] of BANGHAP) {
      if (!grp.includes(b) || !grp.filter(x => x !== b).every(x => present.has(x))) continue;
      const g = goodness(res), label = `사주 속 ${iga(grp.filter(x => x !== b).map(x => ANIMAL[x]).join('·'))} 함께 모여 ${elH(res)} 기운이 커져요`;
      if (g === 'yong') P(W.banghapYong, label); else if (g === 'hee') P(W.banghapHee, label); else if (g === 'bad') M(W.banghapBad, label);
    }
    // 충·형·파·해
    for (const c of chart) {
      const day = c.key === 'day';
      if (Math.abs(c.b - b) === 6) M(day ? W.chungDay : W.chung, `${POSN[c.key]} ${wa(ANIMAL[c.b])} 정면으로 부딪혀요`);
      if (pairIn(HYUNG, b, c.b)) M(day ? W.hyungDay : W.hyung, `${POSN[c.key]} ${wa(ANIMAL[c.b])} 마찰이 있어요`);
      if (pairIn(PA, b, c.b)) M(W.pa, `${POSN[c.key]} ${wa(ANIMAL[c.b])} 살짝 어긋나요`);
      if (pairIn(HAE, b, c.b)) M(W.hae, `${POSN[c.key]} ${wa(ANIMAL[c.b])} 서로 엇갈려요`);
    }
    if (gong.includes(b)) M(W.gongmang, '기운이 비어 있는 자리라 힘이 약해요');
    // 조후: 습토(축·진) / 조토(미·술)
    if (y.johu === 'hot') { if ([1, 4].includes(b)) P(W.johuGood, '열기를 식히는 젖은 흙'); if ([7, 10].includes(b)) M(W.johuBad, '열기를 더하는 마른 흙'); }
    if (y.johu === 'cold') { if ([7, 10].includes(b)) P(W.johuGood, '냉기를 덜어 주는 따뜻한 흙'); if ([1, 4].includes(b)) M(W.johuBad, '냉기를 더하는 젖은 흙'); }
    out.push({ b, score: Math.round(sc * 10) / 10, plus, minus });
  }
  out.sort((a, c) => c.score - a.score || (c.plus.length - a.plus.length));
  // 동점·미세한 차이: 용신 동물을 1순위로 올리고, 원래 1위는 2순위로
  const isYong = o => S.BRANCH_EL[o.b] === y.main;
  if (out.length && !isYong(out[0])) {
    const yi = out.findIndex(isYong);
    if (yi > 0 && out[yi].score > 0 && out[0].score - out[yi].score <= W.closeMargin + 1e-9) {
      const [yo] = out.splice(yi, 1); out.unshift(yo);
    }
  }
  let picks = out.filter(o => o.score > 0).slice(0, 2);
  if (!picks.length) picks = out.slice(0, 1);
  return { picks, all: out };
}

// 화면용 설명: 근거(합·충 등)는 노출하지 않고, 동물마다 좋은 의미만 담백하게
const BLURB = [
  '작지만 누구보다 영리하게 기회를 찾아내는 동물이에요. 곁에 두면 막혀 있던 흐름이 부드럽게 풀리고, 생각지 못한 기회가 조용히 찾아와요.',
  '묵묵하고 성실하게 결실을 쌓는 동물이에요. 곁에 두면 마음이 단단해지고, 꾸준히 쌓아 온 노력이 제자리를 찾아요.',
  '용기와 시작의 힘을 가진 동물이에요. 망설이던 일을 밀어 줄 힘을 주고, 새로운 길을 열어 줘요.',
  '부드러움과 행운의 상징이에요. 사람 사이를 매끄럽게 하고, 일상에 작은 행운을 자주 불러와요.',
  '큰 뜻과 변화를 상징하는 동물이에요. 멈춰 있던 흐름을 깨우고, 더 큰 무대로 이끌어 줘요.',
  '지혜와 통찰의 동물이에요. 복잡한 상황에서도 길을 보게 하고, 중요한 순간에 직감을 또렷하게 해 줘요.',
  '활력과 전진의 동물이에요. 지친 마음에 에너지를 채워 주고, 원하는 곳으로 힘차게 나아가게 해 줘요.',
  '평화와 따뜻함의 상징이에요. 마음을 편안하게 하고, 좋은 사람을 곁으로 불러와요.',
  '재치와 재능의 동물이에요. 숨어 있던 능력을 끌어내고, 기회가 왔을 때 놓치지 않게 해 줘요.',
  '부지런함과 빛나는 결과의 상징이에요. 쌓아 온 노력이 눈에 띄는 성과로 이어지게 도와줘요.',
  '믿음과 보호의 동물이에요. 소중한 사람과 것을 지켜 주고, 오래 갈 인연을 이어 줘요.',
  '풍요와 복의 상징이에요. 넉넉한 기운을 불러와 마음과 살림을 함께 채워 줘요.',
];

function animalSection(r) {
  const { picks } = luckyAnimals(r);   // 점수·근거는 서버 안에서만 사용
  const main = TXT.boost[r.yong.main];
  const KEY = ['rat','ox','tiger','rabbit','dragon','snake','horse','sheep','monkey','rooster','dog','pig'];
  const items = picks.map((p, i) => ({ key: KEY[p.b], emoji: EMOJI[p.b], name: ANIMAL[p.b], rank: i + 1, blurb: BLURB[p.b] }));
  const top = items[0];
  const paras = [
    `당신 사주의 흐름을 살펴 가장 잘 어울리는 동물을 골랐어요.`,
    `${top.name} 모양의 소품, 키링, 폰 배경화면처럼 자주 보는 곳에 두세요. ${main.colors[0][0]}·${main.colors[1][0]} 계열이면 더 잘 어울려요.`,
    `※ 행운 동물은 곁에 두는 상징물을 위한 추천이에요. 사람과의 궁합을 보는 '잘 맞는 띠'와는 달라요.`,
  ];
  return { id: 'animal', icon: '🍀', title: '나의 행운 동물', items, paras };
}

module.exports = { luckyAnimals, animalSection, W };
