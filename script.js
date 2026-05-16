const form = document.getElementById('form');
const input = document.getElementById('desc');
const itemsEl = document.getElementById('items');
const clearBtn = document.getElementById('clear');

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

  // 새로 추가될 때 영수증 하단으로 스크롤
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function randomQty() {
  return Math.floor(Math.random() * 8901) + 100; // 100~9000
}

function familyQty() {
  return Math.floor(Math.random() * 1001) + 8000; // 8000~9000
}

function hasKorean(text) {
  return /[ㄱ-힝]/.test(text);
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
      display = trimmed; // fallback to original
    }
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
  entries.push({ qty, text: display });
  render();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = input.value;
  if (!value.trim()) return;
  input.value = '';
  input.disabled = true;
  await add(value);
  input.disabled = false;
  input.focus();
});

clearBtn.addEventListener('click', () => {
  if (entries.length === 0) return;
  if (!confirm('모든 항목을 지울까요?')) return;
  entries = [];
  render();
});

render();
