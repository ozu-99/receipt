const form = document.getElementById('form');
const input = document.getElementById('desc');
const itemsEl = document.getElementById('items');
const clearBtn = document.getElementById('clear');
const settleBtn = document.getElementById('settle');
const receiptEl = document.getElementById('receipt');
const toastEl = document.getElementById('toast');
const footerNoteEl = receiptEl.querySelector('.footer-note');
const footerNoteOriginalHTML = footerNoteEl.innerHTML;
const totalAmountEl = document.getElementById('total-amount');
const visitBtn = document.getElementById('visit-btn');


// money 효과음 (TOTAL $0.00 안착 시 1회 재생)
const moneyPrototype = new Audio('money.m4a');
moneyPrototype.preload = 'auto';
function playMoneySound() {
  try {
    const s = moneyPrototype.cloneNode();
    s.volume = 0.7;
    s.play().catch(() => {});
  } catch (e) {
    /* 미지원/차단 시 무시 */
  }
}

// $9999.99 부터 $0.00 까지 부드럽게 감소
// 시작 시 9999에서 0.2초 머문 뒤 카운팅 시작 (easeOut으로 끝에 가서 천천히)
function animateTotalAmount(duration = 1500) {
  const INITIAL_PAUSE = 700; // 9999.99에서 정지하는 시간
  const startValue = 9999.99;
  const countDuration = Math.max(0, duration - INITIAL_PAUSE);

  // 즉시 9999.99 표시 (대기 시작)
  totalAmountEl.textContent = '$' + startValue.toFixed(2);

  // 효과음은 전체 안착 0.2초 전 (= duration - 200)
  revealTimers.push(setTimeout(playMoneySound, Math.max(0, duration - 200)));

  // 0.2초 대기 후 카운트다운 시작
  revealTimers.push(
    setTimeout(() => {
      const startTime = Date.now();
      function tick() {
        const elapsed = Date.now() - startTime;
        if (elapsed >= countDuration) {
          totalAmountEl.textContent = '$0.00';
          return;
        }
        const progress = elapsed / countDuration;
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const remaining = startValue * (1 - eased);
        totalAmountEl.textContent = '$' + remaining.toFixed(2);
        revealTimers.push(setTimeout(tick, 30));
      }
      tick();
    }, INITIAL_PAUSE)
  );
}

function typeFooterNote(perChar = 55) {
  // <br>은 \n으로 변환 후, HTML 엔티티(&ldquo; 등)는 decode
  const html = footerNoteOriginalHTML.replace(/<br\s*\/?>/gi, '\n');
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const text = tmp.textContent || '';

  footerNoteEl.innerHTML = '';
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  cursor.textContent = '|';
  footerNoteEl.appendChild(cursor);

  // 각 줄이 끝날 때마다(다음 글자가 \n으로 진입할 때) 커서 깜빡임 + 잠시 대기
  const PAUSE_MS = 1200;

  let i = 0;
  function step() {
    if (i >= text.length) {
      // 마지막 글자 입력 후 커서 1번 정도 깜빡 (0.8초) 뒤 제거
      revealTimers.push(setTimeout(() => cursor.remove(), 800));
      // 2초 뒤 → Visit Countdown 2026 버튼 등장
      revealTimers.push(
        setTimeout(() => {
          visitBtn.classList.add('shown');
          scrollIfHidden(visitBtn);
        }, 2000)
      );
      return;
    }
    const ch = text[i++];
    const node = ch === '\n' ? document.createElement('br') : document.createTextNode(ch);
    footerNoteEl.insertBefore(node, cursor);
    scrollIfHidden(cursor);

    // 한 콘텐츠 줄이 끝나는 시점(= 다음이 \n)이면 PAUSE
    const next = text[i];
    const willPause = next === '\n' && ch !== '\n';
    const nextDelay = willPause ? PAUSE_MS : perChar;
    revealTimers.push(setTimeout(step, nextDelay));
  }
  step();
}

// 대상 요소가 화면 하단(입력창 영역) 아래로 가려져 있으면 그만큼만 스크롤,
// 이미 보이면 아무것도 하지 않음 — "내용이 페이지를 초과한 경우에만" 페이지 이동.
function scrollIfHidden(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const composerArea = 120; // composer + 여유 (px)
  const visibleBottom = window.innerHeight - composerArea;
  if (rect.bottom > visibleBottom) {
    window.scrollBy({ top: rect.bottom - visibleBottom + 8, behavior: 'smooth' });
  }
}

let toastTimer = null;
function showToast(msg, ms = 1800) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    toastTimer = null;
  }, ms);
}

let entries = [];

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function highlightCountdown(safeHtml) {
  // safeHtml은 이미 escapeHtml 처리된 문자열. 키워드에 특수문자 없으니 안전.
  return safeHtml.replace(
    /(카운트다운|Countdown|countdown)/g,
    '<span class="cd-word">$1</span>'
  );
}

function render() {
  itemsEl.innerHTML = entries
    .map(
      (e) => `
      <li class="item">
        <span class="qty${e.qty === '∞' ? ' qty-inf' : ''}">${e.qty == null ? '-' : e.qty}</span>
        <span class="desc">${highlightCountdown(escapeHtml(e.text))}</span>
        <span class="amt">$0.00</span>
      </li>`
    )
    .join('');
  // 항목이 하나도 없으면 CONFIRM 버튼 숨김
  settleBtn.classList.toggle('hidden-empty', entries.length === 0);
  // 자동 스크롤 제거 — 사용자가 화면 첫 부분을 그대로 볼 수 있게
}

function randomQty() {
  return Math.floor(Math.random() * 1901) + 100; // 100~2000
}

function familyQty() {
  return Math.floor(Math.random() * 1001) + 8000; // 8000~9000
}

function hasKorean(text) {
  return /[ㄱ-힝]/.test(text);
}

// 의미있는 텍스트 판별: 한글 음절(가~힣) 1자 이상 OR 영어 알파벳 2자 이상 연속
// 그 외(자모 단독, 단일 영문자, 특수기호/숫자만)는 모두 "의미 없음"으로 간주
function isMeaningless(text) {
  const t = text.trim();
  if (!t) return true;
  if (/[가-힣]/.test(t)) return false;
  if (/[A-Za-z]{2,}/.test(t)) return false;
  return true;
}

// 의미없는 입력에 대한 응답 풀 — 짧고 신의 시점, 영수증 한 줄에 어울리는 톤
const MEANINGLESS_PHRASES = [
  'Gave you this moment',
  'Gave you this breath',
  'Gave you a heartbeat',
  'Gave you the now',
  'Sent you a quiet pause',
  'Granted you stillness',
  'Whispered your name',
  'Held this second',
  'Met you in the silence',
  'Reminded you to breathe',
  'Let time slow for you',
  'Caught you mid-thought',
  'Sat with you a while',
];

function randomMeaninglessPhrase() {
  // 이미 사용된 표현은 피해서 랜덤 선택 (모두 소진되면 풀에서 그냥 랜덤)
  const used = new Set(entries.map((e) => e.text));
  const available = MEANINGLESS_PHRASES.filter((p) => !used.has(p));
  const pool = available.length > 0 ? available : MEANINGLESS_PHRASES;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 화면에 절대 띄우면 안 되는 민감 키워드 (정치/타종교/욕설/성적/폭력/혐오)
// 공백 제거 + 소문자 정규화 후 substring 매칭으로 회피 시도(예: "시 발")도 부분 차단
const SENSITIVE_KEYWORDS = [
  // === 정치 ===
  '정치', '대통령', '국회', '선거', '여당', '야당', '민주당', '국민의힘',
  '보수', '진보', '좌파', '우파', '정부', '의원', '대선', '총선', '시장님',

  // === 타종교 / 무속 ===
  '불교', '불상', '부처', '석가', '사찰', '스님', '보살', '염불',
  '이슬람', '알라', '코란', '쿠란', '무함마드', '모스크', '무슬림',
  '힌두', '시바', '비슈누', '브라흐마',
  '무속', '무당', '굿판', '점집', '신점', '미신', '부적', '사주',

  // === 한국어 욕설 / 비속어 ===
  '시발', '씨발', '씨바', '시바', '좆', '좇', '개새끼', '개새', '개색',
  '병신', '븅신', '빙신', '미친놈', '미친년', '미친새끼', '미친짓',
  '닥쳐', '꺼져', '엿같', '엿먹', '지랄', '염병', '쌍놈', '쌍년',
  '후레자식', '호로새끼', '뒤져버려', '뒤져라', '좃같',

  // === 성적 표현 ===
  '섹스', '자위', '야동', '자지', '보지', '음경', '음부', '음란',
  '강간', '성폭행', '변태', '노출증', '성관계',

  // === 폭력 / 자해 ===
  '죽여버', '죽일거', '죽일놈', '살인', '자살', '자해', '베어버',

  // === 혐오 표현 ===
  '한남충', '김치녀', '한녀충', '메갈', '일베', '워마드',
  '맘충', '급식충', '틀딱', '꼰대새끼',

  // === 영어 욕설 / 위험 ===
  'fuck', 'fucking', 'fck', 'shit', 'sht', 'bitch', 'btch', 'cunt',
  'dick', 'pussy', 'asshole', 'motherfucker', 'mofo',
  'faggot', 'fag', 'nigga', 'nigger', 'retard',
  'suicide', 'rape', 'murder', 'killyourself',
];

function normalizeForMatch(text) {
  // 공백 제거 + 소문자화 (회피 패턴 일부 차단: "시 발", "FUCK")
  return text.toLowerCase().replace(/\s+/g, '');
}

function isSensitive(text) {
  const n = normalizeForMatch(text);
  return SENSITIVE_KEYWORDS.some((kw) => n.includes(kw.toLowerCase()));
}

function isDuplicate(display) {
  return entries.some((e) => e.text === display);
}

async function translate(text) {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('translation failed');
  return await res.json(); // { translation, oncePerLife, isPartner, isInfinite, isFamilyLove, isSpecific, ... }
}

async function add(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  // 의미 없는 입력(ㅎㅎ, ㅠㅠ, asdf, !@#, 123 등)은 API 호출 없이 풀에서 랜덤 응답
  if (isMeaningless(trimmed)) {
    const display = randomMeaninglessPhrase();
    if (isDuplicate(display)) {
      showToast('이미 추가된 항목이에요');
      return;
    }
    entries.push({ qty: randomQty(), text: display });
    render();
    return;
  }

  // 정치/타종교/욕설/성적/폭력/혐오 등 민감 입력은 API 호출 없이 안전 응답
  if (isSensitive(trimmed)) {
    const display = randomMeaninglessPhrase();
    if (isDuplicate(display)) {
      showToast('이미 추가된 항목이에요');
      return;
    }
    entries.push({ qty: randomQty(), text: display });
    render();
    return;
  }

  let display = trimmed;
  let oncePerLife = false;
  let isPartner = false;
  let isInfinite = false;
  let isFamilyLove = false;
  let isSpecific = false;
  if (hasKorean(trimmed)) {
    try {
      const result = await translate(trimmed);
      display = result.translation || trimmed;
      oncePerLife = !!result.oncePerLife;
      isPartner = !!result.isPartner;
      isInfinite = !!result.isInfinite;
      isFamilyLove = !!result.isFamilyLove;
      isSpecific = !!result.isSpecific;
    } catch (err) {
      console.error(err);
      // API 실패 시 한국어 노출 방지 — 안전 풀에서 랜덤 응답으로 대체
      display = randomMeaninglessPhrase();
      oncePerLife = false;
      isPartner = false;
      isInfinite = false;
      isFamilyLove = false;
      isSpecific = false;
    }
  }

  // 사후 안전망: 번역 결과 또는 폴백 표시값에 민감 키워드가 섞이면 안전 응답으로 교체
  if (isSensitive(display)) {
    display = randomMeaninglessPhrase();
    oncePerLife = false;
    isPartner = false;
    isInfinite = false;
    isFamilyLove = false;
    isSpecific = false;
  }
  // 우선순위: 무한대(∞) > 민감관계(공백) > 가족사랑(8000~9000) > 일생한번/세부사건(1) > 랜덤(100~9000)
  const qty = isInfinite
    ? '∞'
    : isPartner
    ? null
    : isFamilyLove
    ? familyQty()
    : oncePerLife || isSpecific
    ? 1
    : randomQty();

  if (isDuplicate(display)) {
    showToast('이미 추가된 항목이에요');
    return;
  }
  entries.push({ qty, text: display });
  render();
}

let revealTimers = [];

function clearRevealTimers() {
  revealTimers.forEach((t) => clearTimeout(t));
  revealTimers = [];
}

function resetSettled() {
  receiptEl.classList.remove('settling', 'settled', 'settled-final');
  itemsEl.querySelectorAll('.amt.shown').forEach((el) => el.classList.remove('shown'));
  clearRevealTimers();
  // footer 텍스트도 원본으로 복구 (다음 결산 시 다시 타이핑됨)
  footerNoteEl.innerHTML = footerNoteOriginalHTML;
  // total 금액도 초기값으로
  totalAmountEl.textContent = '$0.00';
  // visit 버튼 숨김
  visitBtn.classList.remove('shown');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = input.value;
  if (!value.trim()) return;
  input.value = '';
  input.disabled = true;
  // 새 항목이 들어오면 결산 상태를 해제 (다시 입력 가능 상태로)
  resetSettled();
  await add(value);
  input.disabled = false;
  input.focus();
});

clearBtn.addEventListener('click', () => {
  if (entries.length === 0) return;
  if (!confirm('모든 항목을 지울까요?')) return;
  entries = [];
  resetSettled();
  render();
});

settleBtn.addEventListener('click', () => {
  if (entries.length === 0) {
    showToast('감사한 일을 적어보세요');
    return;
  }
  // 이미 결산 진행 중이거나 끝난 상태면 중복 실행 방지
  if (itemsEl.querySelector('.amt.shown')) return;

  const perItemDelay = 450;                // amount 항목당 표시 간격
  const TOTAL_DELAY_AFTER_LAST = 1000;     // 마지막 amount → TOTAL 등장 대기
  const TOTAL_ANIM_MS = 2700;              // TOTAL 카운트다운 길이
  const FOOTER_DELAY_AFTER_TOTAL = 2000;   // TOTAL 안착 후 → 하단 문구 대기

  // 버튼 즉시 사라짐 → 그 다음 amount 애니메이션 시작
  receiptEl.classList.add('settling');

  const amts = itemsEl.querySelectorAll('.amt');

  // 1단계: 위에서부터 amount $0.00 순차 표시
  amts.forEach((amt, i) => {
    revealTimers.push(
      setTimeout(() => {
        amt.classList.add('shown');
        scrollIfHidden(amt);
      }, i * perItemDelay)
    );
  });

  // 2단계: 마지막 amount 표시 후 → TOTAL 등장 + 카운트다운
  const lastAmtAt = (amts.length - 1) * perItemDelay;
  const totalAt = lastAmtAt + TOTAL_DELAY_AFTER_LAST;
  revealTimers.push(
    setTimeout(() => {
      receiptEl.classList.add('settled');
      scrollIfHidden(receiptEl.querySelector('.total'));
      animateTotalAmount(TOTAL_ANIM_MS);
    }, totalAt)
  );

  // 3단계: TOTAL 안착 후 → 하단 문구 타이핑
  const footerAt = totalAt + TOTAL_ANIM_MS + FOOTER_DELAY_AFTER_TOTAL;
  revealTimers.push(
    setTimeout(() => {
      receiptEl.classList.add('settled-final');
      scrollIfHidden(footerNoteEl);
      typeFooterNote();
    }, footerAt)
  );
});

render();
