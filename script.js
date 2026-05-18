const form = document.getElementById('form');
const input = document.getElementById('desc');

// 모바일 키보드 올라올 때 입력창(composer)을 visualViewport 하단에 고정
// (interactive-widget=resizes-content를 지원 안 하는 iOS Safari 등 폴백)
if (window.visualViewport) {
  let kbWasOpen = false;
  const updateComposerOffset = () => {
    const vv = window.visualViewport;
    const keyboardOffset = window.innerHeight - vv.height - vv.offsetTop;
    const offset = Math.max(0, keyboardOffset);
    document.documentElement.style.setProperty('--kb-offset', `${offset}px`);

    // 키보드 열림/닫힘 감지 (100px 이상이면 열림으로 간주)
    if (offset > 100) {
      kbWasOpen = true;
    } else if (kbWasOpen && offset < 50) {
      // 키보드가 막 닫혔다 → items translate 초기화해서 누적된 모든 항목 보이게
      kbWasOpen = false;
      if (typeof resetItemsShift === 'function') resetItemsShift();
    }
  };
  window.visualViewport.addEventListener('resize', updateComposerOffset);
  window.visualViewport.addEventListener('scroll', updateComposerOffset);
  updateComposerOffset();
}

// 입력창 탭/포커스 시 → 페이지/영수증 모두 즉시 상단 고정
// iOS는 포커스 후에도 여러 단계로 scroll-into-view를 시도하므로 0/50/150/350ms 다중 잠금
function lockToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  receiptEl.scrollTop = 0;
}

const lockToTopMulti = () => {
  lockToTop();
  setTimeout(lockToTop, 50);
  setTimeout(lockToTop, 150);
  setTimeout(lockToTop, 350);
};

['focus', 'click', 'touchstart'].forEach((evt) => {
  input.addEventListener(evt, lockToTopMulti, { passive: true });
});
const itemsEl = document.getElementById('items');
const clearBtn = document.getElementById('clear');
const settleBtn = document.getElementById('settle');
const receiptEl = document.getElementById('receipt');
const toastEl = document.getElementById('toast');
const footerNoteEl = receiptEl.querySelector('.footer-note');
const footerNoteOriginalHTML = footerNoteEl.innerHTML;
const totalAmountEl = document.getElementById('total-amount');
const visitBtn = document.getElementById('visit-btn');
const restartBtn = document.getElementById('restart-btn');


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
      // 2초 뒤 → Visit 버튼 등장
      revealTimers.push(
        setTimeout(() => {
          visitBtn.classList.add('shown');
          scrollIfHidden(visitBtn);
        }, 2000)
      );
      // 그 1초 뒤 → Restart 버튼 등장
      revealTimers.push(
        setTimeout(() => {
          restartBtn.classList.add('shown');
          scrollIfHidden(restartBtn);
        }, 3000)
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

// 모바일 감지 — 화면 너비 기준 (600px 미만)
const mobileMQL = window.matchMedia('(max-width: 600px)');
let isMobile = mobileMQL.matches;
mobileMQL.addEventListener('change', (e) => {
  isMobile = e.matches;
  render(); // 뷰포트 바뀌면 다시 렌더
});

// description 텍스트 — 모바일에서 "동사 + you" 패턴이면 첫 줄을 그렇게 끊고 나머지는 자동 줄바꿈
function formatDescription(text) {
  if (!isMobile) return highlightCountdown(escapeHtml(text));
  const words = text.split(/\s+/).filter(Boolean);
  // 두 번째 단어가 정확히 "you"면 첫 줄 = "동사 you", 나머지 줄
  if (words.length > 2 && words[1] === 'you') {
    const first = words.slice(0, 2).join(' ');
    const rest = words.slice(2).join(' ');
    return (
      highlightCountdown(escapeHtml(first)) +
      '<br />' +
      highlightCountdown(escapeHtml(rest))
    );
  }
  return highlightCountdown(escapeHtml(text));
}

function render() {
  itemsEl.innerHTML = entries
    .map(
      (e, idx) => `
      <li class="item">
        <span class="qty${e.qty === '∞' ? ' qty-inf' : ''}">${e.qty == null ? '-' : e.qty}</span>
        <span class="desc">${formatDescription(e.text)}</span>
        <span class="amt">
          <button type="button" class="amt-x" data-idx="${idx}" aria-label="삭제">×</button>
          <span class="amt-val">$0.00</span>
        </span>
      </li>`
    )
    .join('');
  // 항목이 하나도 없으면 CONFIRM / RESTART 버튼 둘 다 숨김
  const empty = entries.length === 0;
  settleBtn.classList.toggle('hidden-empty', empty);
  clearBtn.classList.toggle('hidden-empty', empty);
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

// items의 translateY 누적값 — 각 새 항목마다 한 항목 높이만큼 추가
let itemsShift = 0;

function applyItemsShift() {
  itemsEl.style.transform = itemsShift > 0 ? `translateY(-${itemsShift}px)` : '';
}

function resetItemsShift() {
  itemsShift = 0;
  applyItemsShift();
}

// 2번째 항목부터 — items 영역을 시각적으로 위로 translate해서 "스크롤 효과" 흉내
function scrollToNewItem() {
  if (entries.length <= 1) {
    resetItemsShift();
    return;
  }
  requestAnimationFrame(() => {
    const items = itemsEl.querySelectorAll('.item');
    const lastItem = items[items.length - 1];
    if (!lastItem) return;
    itemsShift += lastItem.offsetHeight;
    applyItemsShift();
  });
}

// 의미있는 텍스트 판별
// - 한글 음절(가~힣) 있으면 의미있음
// - 영어 알파벳은 단순 2자 이상으로 안 됨: 모음 + 키보드 mash 패턴 검사
// - 자모, 단일 영문자, 특수기호/숫자만, 키보드 mash, 모음 없는 자음 나열 → 의미 없음
function isMeaningless(text) {
  const t = text.trim();
  if (!t) return true;
  if (/[가-힣]/.test(t)) return false;

  const asciiTokens = t.match(/[A-Za-z]+/g) || [];
  if (asciiTokens.length === 0) return true; // ASCII도 없음 (자모/숫자/기호만)

  const longest = asciiTokens.reduce((a, b) => (a.length > b.length ? a : b));
  if (longest.length < 2) return true;                  // 1글자 단어
  if (!/[aeiouyAEIOUY]/.test(longest)) return true;     // 모음 없는 자음 나열

  // 키보드 행 mash (qwerty / asdf / zxcv / 양방향)
  if (/qwer|wert|erty|rtyu|tyui|yuio|uiop|asdf|sdfg|dfgh|fghj|ghjk|hjkl|zxcv|xcvb|cvbn|vbnm|qaz|wsx|edc|rfv/i.test(longest)) return true;
  if (/rewq|trew|ytre|uytr|iuyt|oiuy|poiu|fdsa|gfds|hgfd|jhgf|kjhg|lkjh|vcxz|bvcx|nbvc|mnbv/i.test(longest)) return true;

  // 같은 글자 4번 이상 연속 ("aaaa", "Helllllo")
  if (/(.)\1{3,}/.test(longest)) return true;

  // 알파벳 순차 4글자 이상 ("abcd", "wxyz")
  if (/abcd|bcde|cdef|defg|efgh|fghi|ghij|hijk|ijkl|jklm|klmn|lmno|mnop|nopq|opqr|pqrs|qrst|rstu|stuv|tuvw|uvwx|vwxy|wxyz/i.test(longest)) return true;

  // 5자 이상인데 모음 비율 너무 낮음 (< 25%) — "bcdfg", "mngrt" 같은 자음 위주 mash
  if (longest.length >= 5) {
    const vowelCount = (longest.match(/[aeiouyAEIOUY]/g) || []).length;
    if (vowelCount / longest.length < 0.25) return true;
  }

  return false;
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
    scrollToNewItem();
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
    scrollToNewItem();
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
  scrollToNewItem();
}

let revealTimers = [];

function clearRevealTimers() {
  revealTimers.forEach((t) => clearTimeout(t));
  revealTimers = [];
}

function resetSettled() {
  receiptEl.classList.remove('settling', 'settled', 'settled-final');
  itemsEl.querySelectorAll('.amt.shown').forEach((el) => el.classList.remove('shown'));
  resetItemsShift();
  clearRevealTimers();
  settleBtn.disabled = false;
  restartBtn.disabled = false;
  // footer 텍스트도 원본으로 복구 (다음 결산 시 다시 타이핑됨)
  footerNoteEl.innerHTML = footerNoteOriginalHTML;
  // total 금액도 초기값으로
  totalAmountEl.textContent = '$0.00';
  // visit / restart 버튼 숨김
  visitBtn.classList.remove('shown');
  restartBtn.classList.remove('shown');
}

let submitInFlight = false;
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (submitInFlight) return;
  const value = input.value;
  if (!value.trim()) return;
  submitInFlight = true;
  input.value = '';
  // input.disabled = true 를 쓰지 않음 — 모바일에서 키보드가 내려가지 않도록
  // 중복 제출은 submitInFlight 플래그로 차단
  resetSettled();
  try {
    await add(value);
  } finally {
    submitInFlight = false;
  }
});

// 항목 행의 x 버튼 클릭 → 해당 항목 삭제
itemsEl.addEventListener('click', (e) => {
  const target = e.target.closest('.amt-x');
  if (!target) return;
  // 결산 진행 중에는 삭제 불가
  if (receiptEl.classList.contains('settling') || receiptEl.classList.contains('settled')) return;
  const idx = parseInt(target.dataset.idx, 10);
  if (Number.isNaN(idx)) return;
  entries.splice(idx, 1);
  render();
});

clearBtn.addEventListener('click', () => {
  if (clearBtn.disabled || entries.length === 0) return;
  clearBtn.disabled = true;
  const ok = confirm('모든 항목을 지울까요?');
  if (ok) {
    entries = [];
    resetSettled();
    render();
  }
  clearBtn.disabled = false;
});

restartBtn.addEventListener('click', () => {
  if (restartBtn.disabled) return;
  restartBtn.disabled = true;
  entries = [];
  resetSettled();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  input.focus();
});


settleBtn.addEventListener('click', () => {
  if (entries.length === 0) {
    showToast('감사한 일을 적어보세요');
    return;
  }
  // 이중 가드: 비활성화 상태 또는 이미 진행 중이면 무시
  if (settleBtn.disabled || itemsEl.querySelector('.amt.shown')) return;
  settleBtn.disabled = true;

  const perItemDelay = 450;                // amount 항목당 표시 간격
  const TOTAL_DELAY_AFTER_LAST = 500;      // 마지막 amount → TOTAL 등장 대기
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
