// AI 상세 풀이 — 샘플 5~15번 형식(카피 제목 + 본문 400~600자, 문단형)
// 섹션을 4묶음으로 나눠 동시에 요청해요 (Vercel 60초 제한 안에 끝나도록).
// 행운 동물(animal)은 AI가 건드리지 않고 규칙 기반 그대로 써요.
const { S } = require('./saju.js');
const { GROUP } = require('./content-paid.js');
const { EL_PLAIN, POS_KO } = require('./paid.js');

const MODEL = process.env.AI_MODEL || 'claude-sonnet-5-5';
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 50000);

const BATCHES = [['nature', 'honest', 'charm'], ['career', 'wealth', 'love'], ['family', 'people'], ['flow', 'closing']];

const GUIDE = {
  nature: '타고난 기질. 대표 이미지(계절+일간 상징)로 시작해서, 태어난 날 자리와 태어난 시간 자리의 특징, 힘의 강약이 성격에 어떻게 드러나는지 풀어요.',
  honest: "쓴소리. 첫 문장은 '솔직하게 말해 볼게요.'로 시작해요. 이 사주에서 나오는 약점 세 가지를 '두 번째는', '세 번째는'처럼 이어서, 행동 단위로 짚고 바로 쓸 수 있는 해법을 붙여요. 낙인찍는 단어(오만, 이기적 등)는 쓰지 않아요.",
  charm: '나만의 매력. 남들이 잘 모르는 속마음과 버텨 온 시간을 알아주고, 사람들이 이 사람을 찾는 이유, 마지막은 따뜻한 한마디로 마무리해요.',
  career: "나에게 맞는 일. 사주에서 나오는 성향을 근거로 구체적인 직업군 이름을 5~7개 문장 안에 자연스럽게 넣어요. 잘 맞는 일하는 환경과 답답해지는 환경, 이름을 세우기 좋은 시기(연도)를 담아요. 표나 목록처럼 나열하지 말고 문단으로 써요.",
  wealth: '재물복. 재물을 뜻하는 기운이 많은지 적은지, 돈이 들어오는 방식(직접 찾아 나서는지, 쌓는지, 재능이 돈이 되는지), 조심할 해와 좋아지는 시기(연도)를 담아요.',
  love: '연애운. 연인을 뜻하는 기운(남성은 재물 기운, 여성은 명예·관직 기운)이 어떤지, 배우자 자리(태어난 날 자리)의 성격, 연애 스타일과 주의점, 인연이 커지는 시기(연도)를 담아요.',
  family: '가족 인연. 어머니(나를 돕는 기운), 아버지(재물 기운), 형제(나와 같은 기운)의 많고 적음과 자리, 원국 안의 부딪힘·어울림을 근거로 관계의 결을 풀어요. 단정하지 말고 경향으로 쓰고, 마지막은 관계를 위한 조언으로 마무리해요.',
  people: '곁에 둘 사람. 이 사람에게 힘이 되는 사람의 성향(가장 필요한 기운을 닮은 사람), 부딪히기 쉬운 사람, 관계의 양보다 깊이에 대한 조언을 담아요.',
  flow: "내년 운세와 10년 흐름. 첫 문단은 내년(연도와 띠 이름)의 흐름과 주의점, 둘째 문단은 지금의 10년 운과 다음 10년 운이 바뀌는 해, 셋째 문단은 그 사이 2~3년의 타이밍 조언이에요. 행운 동물의 해가 겹치면 '행운 동물인 ○○의 해'라고 가볍게 언급해도 돼요(이유는 말하지 않아요).",
  closing: '마지막 한마디. 대표 이미지로 돌아가서 지금까지 버텨 온 시간을 인정하고, 앞으로 1~2년 안에 할 일과 다가올 10년에 대한 응원으로 마무리해요.',
};

const STYLE_EXAMPLE = `[말투 예시 — 형식과 톤만 참고하고, 내용·비유·문장은 절대 베끼지 마세요]
{"id":"nature","headline":"산 위에 피어오른 불꽃, 굽히지 않는 자존심이 당신의 엔진이에요","paras":["당신은 큰 산이 불을 디디고 서 있는 모습이에요. 태어난 날의 자리에 강한 불이 있어서, 겨울에 태어났는데도 안에는 주도권을 쥐려는 뜨거운 의지가 있어요. 한번 마음먹으면 밀고 나가고, 남에게 굽히는 걸 아주 힘들어해요.","태어난 시간에는 날카롭게 다듬어진 보석이 두 개나 있어요. 말이 정확하고, 기술이나 손재주가 좋고, 어설픈 것을 두고 보지 못하는 완성도 기준이 있어요. 당신은 말보다 결과물로 자신을 증명하는 사람이에요.","태어난 해에는 규칙과 위계를 뜻하는 나무가 하나 있지만, 뿌리가 약해요. 그래서 위에서 일일이 지시하는 환경에서는 숨이 막히고, 자기 방식대로 판을 짤 수 있는 자리에서 능력이 두 배로 나와요."]}
{"id":"honest","headline":"산은 움직이지 않아서 산이지만, 가끔은 바람에 길을 내 주세요","paras":["솔직하게 말해 볼게요. 당신의 가장 큰 무기인 뚝심은, 다른 사람에게는 고집으로 보일 때가 많아요. 이미 결론을 내린 상태에서 의견을 물으면, 상대는 자기 말이 들리지 않는다고 느껴요.","두 번째는 말의 날이에요. 날카로운 감각 덕분에 문제를 정확히 짚지만, 그만큼 상대에게는 상처가 될 수 있어요. 지적을 하기 전에 잘한 점을 하나 먼저 말하는 습관이 당신의 말을 훨씬 멀리 가게 해 줘요.","세 번째는 늦은 시작이에요. 안에 쌓아 둔 게 많은데 '아직 완벽하지 않다'는 이유로 꺼내지 않는 것들이 있지 않나요? 80점일 때 먼저 내놓고, 반응을 보며 100점으로 다듬어 가세요."]}`;

const SYSTEM = `당신은 20년 경력의 명리학 상담가이자, 사주를 누구나 이해할 수 있는 쉬운 말로 풀어 주는 작가예요.

[근거]
- 주어진 사주 데이터만 근거로 써요. 원국에 없는 글자나 관계를 지어내지 않아요.
- '가장 필요한 기운'은 데이터에 적힌 판정과 다르게 말하지 않아요.
- 이 사람만의 조합이 드러나게 쓰고, 누구에게나 맞는 말은 피해요.

[쉬운 말 — 가장 중요]
- 본문과 제목에 명리 전문용어를 쓰지 않아요. 금지 예: 용신, 희신, 기신, 일간, 일주, 천간, 지지, 십신 이름(비견·겁재·식신·상관·편재·정재·편관·정관·편인·정인), 대운, 세운, 신강, 신약, 충, 합, 형, 파, 해, 공망, 귀인, 도화, 한자.
- 대신 이렇게 풀어요: 오행은 나무·불·흙·쇠·물 / 대운은 '10년 운' / 일지는 '태어난 날의 자리' / 시주는 '태어난 시간' / 충은 '부딪힘' / 합은 '어울림'.
- 데이터 속 괄호 설명(예: 재물 기운)은 참고용이에요. 문장에는 쉬운 말만 써요.

[형식]
- 섹션마다 headline 한 줄(15~35자, 이 사람의 이미지가 보이는 카피)과 본문 3문단을 써요.
- 본문은 한 섹션에 공백 포함 400~600자. 해요체. 따뜻하지만 구체적으로.
- 표, 목록, 퍼센트, 점수를 쓰지 않아요. 연도는 써도 돼요(예: 2027년). 나이를 쓸 땐 한국 나이예요.
- 호칭: 이름이 있으면 '○○님', 없으면 '당신'.

[안전]
- 질병·사망·이혼·사고를 단정하거나 겁주지 않아요. 투자·의료·법률 결정을 지시하지 않아요.
- 행운 동물을 고른 이유나 계산 방법은 말하지 않아요.

반드시 JSON만 출력해요: {"sections":[{"id":"...","headline":"...","paras":["...","...","..."]}]}`;

function chartText(r, F, name) {
  const god = g => `${g}(${({비겁:'나와 같은 기운',식상:'표현·재능 기운',재성:'재물 기운',관성:'명예·책임 기운',인성:'나를 돕는 기운'})[GROUP[g]]})`;
  const pil = r.pillars.map(p => p.stem === null ? `- ${POS_KO[p.key]}: 모름` :
    `- ${POS_KO[p.key]}: ${S.STEMS_KO[p.stem]}${S.BRANCHES_KO[p.branch]} — 위 글자 ${EL_PLAIN[S.STEM_EL[p.stem]]}(${p.key === 'day' ? '본인' : god(p.stemGod)}), 아래 글자 ${EL_PLAIN[S.BRANCH_EL[p.branch]]}(${god(p.branchGod)})`).join('\n');
  const share = r.yong.share.map((v, i) => `${EL_PLAIN[i]} ${Math.round(v * 100)}%`).join(', ');
  const gc = Object.entries(r.godCount).map(([k, v]) => `${k}(${({비겁:'나와 같은 기운',식상:'표현·재능',재성:'재물',관성:'명예·책임',인성:'나를 돕는 기운'})[k]}) ${v}`).join(', ');
  const inner = F.inner.length ? F.inner.map(x => `${POS_KO[x.a]}–${POS_KO[x.b]} ${({충:'부딪힘',합:'어울림',형:'마찰'})[x.rel]}`).join(', ') : '특별한 부딪힘·어울림 없음';
  const dw = r.daewoon.map(d => `${d.year}년~(${d.age}세) ${S.STEMS_KO[d.stem]}${S.BRANCHES_KO[d.branch]}: ${god(d.stemGod)} / ${god(d.branchGod)}${d === F.curDw ? ' ← 지금' : d === F.nextDw ? ' ← 다음' : ''}`).join('\n');
  const yrs = F.years.map(y => `${y.year}년 ${S.STEMS_KO[y.stem]}${S.BRANCHES_KO[y.branch]}(${S.ANIMALS[y.branch]}띠 해): ${god(y.sGod)} / ${god(y.bGod)}${y.rel ? `, 태어난 날 자리와 ${({충:'부딪힘',합:'어울림',형:'마찰'})[y.rel]}` : ''}${F.animals.some(a => a.b === y.branch) ? ', 행운 동물의 해' : ''}`).join('\n');
  return `이름: ${name || '(없음 → 당신)'} / 성별: ${F.gender === 'M' ? '남성' : '여성'} / 양력 ${r.solarDate.y}.${r.solarDate.m}.${r.solarDate.d} / 올해 ${F.nowYear}년, 한국 나이 ${F.age}세
대표 이미지: ${F.image} (${S.STEMS_KO[r.dayStem]}${'목화토금수'[S.STEM_EL[r.dayStem]]} 일간, ${F.season} 출생)
사주:
${pil}
오행 비율: ${share}
기운 분포: ${gc}
힘의 강약: ${r.strength} (나를 돕는 기운 ${Math.round(r.strengthRatio * 100)}%)
가장 필요한 기운: ${EL_PLAIN[r.yong.main]} / 함께 챙기면 좋은 기운: ${EL_PLAIN[r.yong.hee]} / 줄이면 좋은 기운: ${EL_PLAIN[r.yong.gi]}
원국 안의 관계: ${inner}${F.peach ? ' / 사람을 끄는 매력의 글자 있음' : ''}
10년 운:
${dw}
다가오는 해:
${yrs}
행운 동물: ${F.animals.map(a => a.name).join(', ')}`;
}

async function callBatch(ids, ctx, key) {
  const user = `${ctx}

${STYLE_EXAMPLE}

이번에 쓸 섹션: ${ids.join(', ')}
${ids.map(id => `- ${id}: ${GUIDE[id]}`).join('\n')}

형식: {"sections":[${ids.map(id => `{"id":"${id}","headline":"...","paras":["...","...","..."]}`).join(',')}]}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch((process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 3500, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
    });
    if (!res.ok) { console.error('AI error', res.status, (await res.text()).slice(0, 300)); return []; }
    const data = await res.json();
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    return (json.sections || []).filter(s => ids.includes(s.id));
  } catch (e) {
    console.error('AI failed', ids.join(','), e.message);
    return [];
  } finally { clearTimeout(timer); }
}

const JARGON = /용신|희신|기신|일간|천간|비견|겁재|식신|편재|정재|편관|정관|편인|정인|대운|세운|신강|신약|공망|[\u4e00-\u9fff]/;   // '상관없다', '지지하다'처럼 일상어와 겹치는 말은 검사에서 제외
function valid(s) {
  if (!s || typeof s.headline !== 'string' || !Array.isArray(s.paras) || !s.paras.length) return false;
  if (!s.paras.every(p => typeof p === 'string')) return false;
  const len = s.paras.join('').length;
  return len >= 250 && len <= 1000;
}
function clean(s) {   // 전문용어가 섞이면 해당 섹션은 규칙 문장으로 대체
  return JARGON.test(s.headline + s.paras.join('')) ? null : s;
}

async function aiReading(r, gender, name, draft) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const ctx = chartText(r, draft.facts, name);
  const results = (await Promise.all(BATCHES.map(ids => callBatch(ids, ctx, key)))).flat();
  const byId = {};
  for (const s of results) if (valid(s) && clean(s)) byId[s.id] = s;
  const used = Object.keys(byId).length;
  if (!used) return null;
  const sections = draft.sections.map(s => byId[s.id] ? { ...s, headline: byId[s.id].headline.trim(), paras: byId[s.id].paras.map(p => p.trim()) } : s);
  return { sections, aiCount: used };
}

module.exports = { aiReading, MODEL, chartText, BATCHES };
