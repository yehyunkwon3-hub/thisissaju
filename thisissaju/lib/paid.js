// 상세 풀이 — 11개 섹션(샘플 5~15번 구성)
// 1) facts(): AI에게 넘길 사주 사실 정리
// 2) buildPaid(): AI가 꺼져 있거나 실패한 섹션을 채우는 규칙 기반 문장 (행운 동물은 항상 규칙 기반)
const { S } = require('./saju.js');
const { PAID, GROUP } = require('./content-paid.js');
const TXT = require('../public/js/content-free.js');
const { animalSection, luckyAnimals } = require('./animal.js');

// 화면에 보이는 섹션 순서 (샘플 5~15번)
const SECTIONS = [
  { id: 'nature',  icon: '🌱', title: '타고난 기질' },
  { id: 'honest',  icon: '🗣️', title: '쓴소리 좀 할게' },
  { id: 'charm',   icon: '✨', title: '나만의 매력' },
  { id: 'career',  icon: '🧭', title: '나에게 맞는 일' },
  { id: 'wealth',  icon: '💰', title: '재물복' },
  { id: 'love',    icon: '💗', title: '연애운' },
  { id: 'family',  icon: '🏡', title: '가족 인연' },
  { id: 'people',  icon: '🤝', title: '곁에 둘 사람' },
  { id: 'flow',    icon: '🌙', title: '내년 운세와 10년 흐름' },
  { id: 'animal',  icon: '🍀', title: '나의 행운 동물' },
  { id: 'closing', icon: '💌', title: '마지막 한마디' },
];

const EL_PLAIN = ['나무', '불', '흙', '쇠', '물'];
const SEASON = b => [2, 3, 4].includes(b) ? '봄' : [5, 6, 7].includes(b) ? '여름' : [8, 9, 10].includes(b) ? '가을' : '겨울';
const gzKo = (s, b) => S.STEMS_KO[s] + S.BRANCHES_KO[b];
const LIUHE = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
const HYUNG = [[0,3],[2,5],[5,8],[2,8],[1,10],[10,7],[1,7]];
const pairIn = (list, a, b) => list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const POS_KO = { year: '태어난 해', month: '태어난 달', day: '태어난 날', hour: '태어난 시간' };
const relOf = (a, b) => Math.abs(a - b) === 6 ? '충' : pairIn(LIUHE, a, b) ? '합' : pairIn(HYUNG, a, b) || (a === b && [4, 6, 9, 11].includes(a)) ? '형' : null;
const jo = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c % 28 ? a : b); };

function facts(r, gender, nowYear) {
  const g = r.godCount;
  const years = [1, 2, 3].map(k => {
    const y = nowYear + k, p = S.yearPillar(y);
    return { year: y, stem: p.stem, branch: p.branch, sGod: S.tenGod(r.dayStem, p.stem), bGod: S.tenGod(r.dayStem, S.BRANCH_MAIN[p.branch]),
      rel: relOf(p.branch, r.dayBranch) };
  });
  const ny = years[0];
  const curDw = r.daewoon.filter(d => d.year <= nowYear).pop() || null;
  const nextDw = r.daewoon.find(d => d.year > nowYear) || null;
  const groups = Object.entries(g).sort((a, b) => b[1] - a[1]);
  const branches = r.pillars.filter(p => p.branch !== null);
  const inner = [];
  for (let i = 0; i < branches.length; i++) for (let j = i + 1; j < branches.length; j++) {
    const rel = relOf(branches[i].branch, branches[j].branch);
    if (rel) inner.push({ a: branches[i].key, b: branches[j].key, rel });
  }
  const { picks } = luckyAnimals(r);
  return {
    nowYear, age: nowYear - r.solarDate.y + 1, gender,
    image: `${SEASON(r.pillars[2].branch)}에 태어난 ${TXT.dayStem[r.dayStem].img}`,
    season: SEASON(r.pillars[2].branch),
    loveN: gender === 'M' ? g.재성 : g.관성, loveGroup: gender === 'M' ? '재성' : '관성',
    peach: r.pillars.some(p => p.branch !== null && [0, 3, 6, 9].includes(p.branch)),
    spouseGod: r.pillars[1].branchGod,
    wealthN: g.재성, sikN: g.식상, inN: g.인성, biN: g.비겁, gwanN: g.관성,
    top: groups[0][0], second: groups[1][1] === groups[0][1] ? groups[1][0] : null,
    years, ny, nextYear: ny.year, curDw, nextDw, inner,
    animals: picks.map(p => ({ b: p.b, name: S.ANIMALS ? S.ANIMALS[p.b] : null })),
  };
}

// ---------- 규칙 기반 문장 (AI 실패 시) ----------
const HONEST = {
  비겁: ['내 방식이 옳다는 확신이 강해서, 다른 사람의 의견을 끝까지 듣기 전에 결론을 내릴 때가 많아요. 상대는 자기 말이 들리지 않는다고 느껴요.',
         '혼자 버티는 힘이 큰 만큼 도움을 청하는 데 서툴러요. 조금 기대는 것도 실력이에요.'],
  식상: ['판단이 빠르고 말이 정확한 만큼, 맞는 말도 차갑게 들릴 때가 있어요. 지적하기 전에 잘한 점을 하나 먼저 말해 보세요.',
         '새 일을 벌이는 힘은 대단한데 마무리 전에 다음 일로 마음이 가요. 하나를 끝내고 하나를 시작하는 규칙을 만들어 보세요.'],
  재성: ['결과와 효율을 먼저 보느라 사람의 마음을 놓칠 때가 있어요. 숫자로 설명되지 않는 것도 챙겨 주세요.',
         '할 일을 너무 많이 쥐고 있으면 정작 중요한 하나가 흐려져요. 덜어내는 것도 능력이에요.'],
  관성: ['책임감이 강한 만큼 스스로를 너무 몰아붙여요. 기대에 다 맞추려다 내 마음이 먼저 지쳐요.',
         '정해진 틀 밖으로 나가는 걸 망설이다 기회를 놓칠 때가 있어요. 작은 일부터 내 방식대로 해 보세요.'],
  인성: ['생각과 준비가 길어서 시작이 늦어요. 80점일 때 먼저 내놓고, 반응을 보며 다듬어 가세요.',
         '받는 데 익숙해지면 내가 가진 힘을 잊어요. 배운 것을 밖으로 꺼내 쓸 때 운이 움직여요.'],
};
const CHARM = {
  비겁: '말한 대로 하는 사람이라는 데서 나와요. 약속을 지키고, 내 사람은 끝까지 챙기는 의리가 주변을 든든하게 해요.',
  식상: '생각을 말과 결과물로 풀어내는 힘에서 나와요. 함께 이야기하면 무언가를 얻어 간다고 느끼게 하는 사람이에요.',
  재성: '현실을 정확히 보고 일을 되게 만드는 감각에서 나와요. 막막한 상황에서 길을 찾아 주는 사람이에요.',
  관성: '반듯함과 책임감에서 나와요. 맡기면 믿을 수 있는 사람이라는 신뢰가 가장 큰 자산이에요.',
  인성: '깊이 생각하고 이해하려는 태도에서 나와요. 상대의 말을 끝까지 들어 주는 사람이라 마음을 털어놓게 돼요.',
};
const PEOPLE = [ // 용신 오행 → 곁에 두면 좋은 사람
  '새로운 시도를 응원해 주고 함께 성장하자고 말해 주는 사람',
  '밝고 솔직하게 마음을 표현해 주는 따뜻한 사람',
  '말보다 행동으로 믿음을 주는 차분하고 듬직한 사람',
  '정리가 빠르고 말이 정확한, 기준이 분명한 사람',
  '차분하고 생각이 깊은, 말을 끝까지 들어 주는 사람',
];
const FAMILY_IN = ['어머니나 어른들의 뒷받침을 뜻하는 기운이 드러나 있지 않아서, 스스로 길을 찾아온 시간이 많았을 거예요.',
  '어머니나 어른들의 마음의 뒷받침을 받으며 자란 사주예요. 그 안정감이 지금의 바탕이 됐어요.',
  '어머니나 어른들의 보살핌이 큰 사주예요. 다만 걱정과 조언이 때로는 간섭처럼 느껴질 수 있어요.'];
const FAMILY_BI = ['형제나 또래를 뜻하는 기운은 약한 편이라, 가족 안에서도 자기 일은 스스로 해결해 온 시간이 많았을 거예요.',
  '형제나 가까운 또래와는 서로 힘이 되어 주는 인연이에요.',
  '형제나 가까운 사람이 많지만, 서로 닮은 고집 때문에 부딪히는 일도 있어요. 가족 사이의 돈 문제는 처음부터 기준을 분명히 해 두세요.'];
const YEAR_PLAIN = {
  비겁: '내 힘이 커지는 해예요. 독립이나 새 도전에 용기가 생기지만, 경쟁과 지출도 함께 늘어요. 동업과 보증은 신중하게 보세요.',
  식상: '표현과 재능이 밖으로 터지는 해예요. 새 프로젝트나 부업을 시작하기 좋아요. 다만 말이 앞서지 않게 조심하세요.',
  재성: '재물과 기회가 움직이는 해예요. 수입이 늘거나 큰돈이 오갈 수 있고, 인연의 흐름도 활발해져요.',
  관성: '책임과 자리가 생기는 해예요. 승진이나 소속 변화가 있을 수 있어요. 무게가 커지는 만큼 휴식을 꼭 챙기세요.',
  인성: '배움과 문서의 해예요. 공부, 자격, 계약, 이사에 좋은 흐름이에요. 생각만 하다 실행을 놓치지 않게 하세요.',
};
const DW_PLAIN = {
  비겁: '내 힘으로 판을 짜고 독립하려는 마음이 커지는', 식상: '재능을 펼치고 표현하는',
  재성: '재물과 현실적인 성과를 쌓는', 관성: '사회적인 자리와 책임이 커지는', 인성: '배우고 내공을 쌓는',
};
const CAREER_PLAIN = {
  비겁: '스스로 판을 짜는 일이 잘 맞아요. 창업, 프리랜서, 영업, 팀을 이끄는 자리처럼 내 판단으로 움직일 수 있는 곳에서 힘이 나요.',
  식상: '생각을 말과 글, 결과물로 바꾸는 일이 잘 맞아요. 기획, 콘텐츠, 교육, 디자인, 마케팅처럼 표현할 여지가 있는 곳에서 빛나요.',
  재성: '숫자와 결과로 말하는 일이 잘 맞아요. 사업, 금융, 유통, 세일즈처럼 성과가 바로 보이는 분야에서 실력이 드러나요.',
  관성: '체계 안에서 인정받는 일이 잘 맞아요. 공공기관, 큰 조직, 법과 행정, 관리직처럼 명예와 책임이 따르는 자리가 어울려요.',
  인성: '배우고 깊이 파고드는 일이 잘 맞아요. 연구, 교육, 상담, 자격 기반의 전문직처럼 오래 쌓을수록 가치가 커지는 일에서 빛나요.',
};

function nm(name) { return name ? `${name}님` : '당신'; }

function rulesSection(id, r, F, name) {
  const who = nm(name), ds = TXT.dayStem[r.dayStem];
  const need = EL_PLAIN[r.yong.main], with2 = EL_PLAIN[r.yong.hee];
  const strong = r.strength === '신강' ? '스스로 버티는 힘이 강한 편이라, 힘을 더 쌓기보다 밖으로 흘려보낼 때 운이 열려요.'
    : r.strength === '신약' ? '밖으로 쓰는 힘에 비해 스스로를 채우는 힘이 약한 편이라, 잘 쉬고 잘 채울 때 운이 열려요.'
    : '기운의 균형이 비교적 고른 편이라, 상황에 맞게 힘을 조절하는 감각이 좋아요.';
  const sameDw = F.curDw && F.nextDw && GROUP[F.curDw.stemGod] === GROUP[F.nextDw.stemGod];
  const dwLine = !F.nextDw ? '' : sameDw ? `${F.nextDw.year}년부터 시작되는 다음 10년에는 그 흐름이 한층 깊어져요.` : `${F.nextDw.year}년부터는 ${DW_PLAIN[GROUP[F.nextDw.stemGod]]} 10년이 시작돼요.`;
  switch (id) {
    case 'nature': return { headline: `${F.image}, ${ds.strong.split(',')[0]}이 ${who}의 중심이에요`, paras: [
      `${who}은 ${jo(F.image, '이에요', '예요')}. ${ds.body}`, strong,
      `가장 필요한 기운은 ${jo(need, '이에요', '예요')}. ${need} 기운을 가까이 둘수록 타고난 장점이 더 선명해져요.`] };
    case 'honest': { const h = HONEST[F.top] || HONEST.비겁; return { headline: '좋은 점이 큰 만큼, 한 번쯤 돌아볼 부분도 있어요', paras: [
      `솔직하게 말해 볼게요. ${h[0]}`, `두 번째는 이거예요. ${h[1]}`, `세 번째는 ${ds.care}`] }; }
    case 'charm': return { headline: `${who}의 진짜 매력은 가까이서 오래 볼수록 드러나요`, paras: [
      `${who}의 매력은 ${CHARM[F.top] || CHARM.비겁}`, `${ds.strong}. 이 세 가지가 사람들이 ${who}을 다시 찾게 만드는 이유예요.`,
      F.peach ? '사람을 끄는 분위기도 타고났어요. 처음 만난 사람도 금방 마음을 열게 하는 힘이 있어요.' : '처음에는 조용해 보여도, 시간이 갈수록 믿음이 깊어지는 사람이에요.'] };
    case 'career': return { headline: `${who}의 기질이 그대로 무기가 되는 일을 고르세요`, paras: [
      CAREER_PLAIN[F.top] || CAREER_PLAIN.비겁,
      F.second ? `${CAREER_PLAIN[F.second].split('.')[0]}. 두 가지 기질을 함께 쓰는 자리라면 더 좋아요.` : '한 분야를 깊게 파고들어 이름을 세울수록 일이 편해져요.',
      `일을 고를 때는 ${need} 기운이 살아나는 환경인지 보세요. ${dwLine}`] };
    case 'wealth': return { headline: F.wealthN ? '재물을 다루는 감각이 있어요. 관리가 곧 실력이에요' : '돈을 좇기보다 실력을 쌓을 때 재물이 따라와요', paras: [
      PAID.wealth[Math.min(3, F.wealthN)].replace('재물의 별', '재물을 뜻하는 기운'),
      F.sikN > 0 && F.wealthN > 0 ? '내가 만든 것, 내 말과 기술이 그대로 돈이 되는 구조예요. 부업이나 개인 이름으로 하는 일에서도 수입이 생기기 쉬워요.' : PAID.wealthStrong[r.strength],
      `${F.nextYear}년은 ${YEAR_PLAIN[GROUP[F.ny.sGod]].split('.')[0]}. 큰 지출은 흐름을 보며 천천히 정하세요.`] };
    case 'love': return { headline: F.loveN ? '천천히 깊어지는 사랑, 마음을 표현할수록 가까워져요' : '기다리면 늦고 찾아 나서면 빨라요', paras: [
      PAID.loveStar[Math.min(3, F.loveN)].replace('연애를 뜻하는 별', '연인을 뜻하는 기운').replace('연애의 별', '연인을 뜻하는 기운').replace(' 대운·세운에서 그 별이 들어오는 해를 노려 보세요.', ''),
      PAID.spouse[F.spouseGod] || '', F.peach ? '사람을 끄는 매력과 분위기를 타고났어요. 다만 마음을 말로 표현하는 것을 잊지 마세요.' : '연애에서는 정답보다 온도가 먼저예요. 구체적인 말 한마디가 관계를 단단하게 해요.'].filter(Boolean) };
    case 'family': return { headline: '표현 방식은 달라도 마음은 같은 방향이에요', paras: [
      FAMILY_IN[Math.min(2, F.inN)], FAMILY_BI[Math.min(2, F.biN)],
      F.inner.some(x => x.rel === '충' && (x.a === 'month' || x.b === 'month')) ? '가족 사이에서는 서로의 방식을 존중하는 적당한 거리가 오히려 관계를 따뜻하게 만들어요.' : '가족과는 크게 부딪히기보다 조용히 서로를 받쳐 주는 인연이에요.'] };
    case 'people': return { headline: '나를 부드럽게 풀어 줄 사람, 그게 진짜 내 편이에요', paras: [
      `${who}에게 힘이 되는 사람은 ${PEOPLE[r.yong.main]}이에요.`, `함께 챙기면 좋은 사람은 ${PEOPLE[r.yong.hee]}이에요.`,
      '인간관계는 양보다 깊이가 중요해요. 내 약한 모습까지 보여 줄 수 있는 사람 두세 명이면 충분해요.'] };
    case 'flow': {
      const ny = F.ny; const cur = F.curDw;
      return { headline: `${F.nextYear}년의 흐름과 앞으로의 10년`, paras: [
        `${F.nextYear}년은 ${YEAR_PLAIN[GROUP[ny.sGod]]}${ny.rel === '충' ? ' 생활의 자리가 크게 움직이기 쉬운 해라 이사나 이직 같은 변화가 생길 수 있어요.' : ny.rel === '합' ? ' 좋은 인연이나 협력자를 만나기 쉬운 해예요.' : ''}`,
        cur ? `지금은 ${cur.year}년부터 이어지는 ${DW_PLAIN[GROUP[cur.stemGod]]} 10년이에요. ${dwLine}` : `첫 10년 운은 ${r.daewoon[0].year}년에 시작해요.`] };
    }
    case 'closing': return { headline: `${who}은 이미 충분히 단단해요. 이제 꺼내 보일 차례예요`, paras: [
      `${who}은 ${jo(F.image, '이에요', '예요')}. 지금까지 쌓아 온 힘은 이미 충분해요.`,
      `앞으로는 ${need} 기운을 가까이 두고, ${with2} 기운도 함께 챙겨 보세요. ${dwLine}`,
      '완벽하지 않아도 괜찮아요. 한 걸음씩 꺼내 놓는 만큼 운은 따라와요.'] };
  }
  return null;
}

function buildPaid(r, gender, nowYear, name) {
  const F = facts(r, gender, nowYear);
  const sections = SECTIONS.map(s => {
    if (s.id === 'animal') return { ...animalSection(r), headline: null };
    const body = rulesSection(s.id, r, F, name);
    return { ...s, headline: body.headline, paras: body.paras };
  });
  return { sections, facts: F };
}

module.exports = { buildPaid, facts, SECTIONS, EL_PLAIN, POS_KO };
