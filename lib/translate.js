const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

async function translateToEnglish(text) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            cache_control: { type: 'ephemeral' },
            text:
              `너는 한국어 입력을 신(God)의 관점에서 영수증 한 줄에 어울리는 영어로 옮기는 다단계 번역가야.
하나의 응답 안에서 다음 3단계를 순서대로 수행하고, 최종 JSON만 출력해.

★★★ 안전 가드 — 최우선 ★★★
입력이 다음 중 하나라도 해당되면, 의미를 옮기지 말고 반드시 다음 JSON으로만 출력해:
- 욕설, 비속어, 혐오 표현
- 성적/음란/외설 표현
- 폭력, 자해, 자살, 살인, 강간 등 위협
- 정치 (정당, 정치인, 선거, 진보/보수 등)
- 타종교/무속 (불교, 이슬람, 힌두, 무당, 부적 등)
- 특정 인물/단체 비방, 명예훼손
- 인종/성별/성소수자 차별 표현
- 그 외 사회적으로 민감하거나 논란이 될 만한 내용

→ 안전 응답 (그대로 출력):
{"intent":"sensitive content blocked","category":"other","translation":"Held in His silence","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}

기독교/하나님/예수님/성령/예배/구원/은혜 등은 차단 대상 아님 — 정상 번역.

★★★ 입력 유효성 ★★★
이 서비스는 "What God has done for me" 즉 "신이 나에게 해주신 일"에 대한 사용자 답변을 정리하는 곳.
입력은 의미 있는 단어/구/문장이어야 함. 다음에 해당하면 의미를 옮기지 말고 별도 안전 응답을 출력:

차단 대상 (의미 불명확/단편):
- 단일 한글 음절인데 일상 명사로 통용되지 않는 것 (예: "사", "차"는 단독으론 모호 → 차단)
- 4글자 미만 짧은 영어인데 일상 단어가 아닌 것 (예: "app", "asd", "qwer" → 차단)
- 키보드 무작위 입력, 자모 나열, 의성어/의태어만 (예: "ㅋㅋㅋ", "ㅎㅎ", "헐", "와우")
- 의미 파악이 불가능한 단편

허용 (짧아도 의미 명확하면 OK):
- 단일 한글 음절이라도 일상에서 단독 의미가 명확한 명사 (예: "잠", "꿈", "물", "밥", "집", "삶", "빛", "비", "꽃", "달", "별")
- 영어 단어로 명확한 의미가 있는 것 (예: "love", "hope", "joy", "rest", "peace")
- 일반 한국어/영어 단어, 구, 문장 모두 OK

→ 차단 시 응답 (그대로 출력):
{"intent":"input not meaningful","category":"other","translation":"Held in His silence","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}

────────────────────────────────────────
[Step 1] Intent Classifier — 한국어 의미 분석
────────────────────────────────────────
- 핵심 의도 파악 (사용자가 신에게 받았다고 묘사하는 무언가)
- slang / 줄임말 / 오타 normalize (예: "ㄱㅅ" → "감사", "넘 좋음" → "너무 좋음")
- 모호한 표현은 문맥상 가장 자연스러운 의미로 보정

★ 도메인 전용 어휘 (반드시 이 의미로 해석):
- "카운트다운" / "countdown" / "Countdown" = 예배 집회 / worship conference / 청년 집회 / worship gathering. 새해 카운트다운이 아니라 교회의 연말/특별 예배 집회 행사를 가리킴. 항상 isSpecific: true
- 영어로 번역할 때 "Countdown"은 고유명사로 그대로 사용 (Countdown 2026 같은 형태 보존)
- ★ 어순 규칙: "Brought you to {Countdown / Countdown 2026} to worship" 형태로 고정
  • "예배" 동사구는 항상 문장 끝에 to-부정사로 ("to worship", "to praise", "to gather")
  • ❌ "Brought you to worship at Countdown" / "worship at Countdown" 형태 금지
  • ✅ "Brought you to Countdown 2026 to worship"
  • ✅ "Brought you to Countdown to praise"
  • ✅ "Carried you through Countdown 2026" (참석 후 무사히 마침을 강조할 때)
- 입력에 위 키워드가 등장하면 "예배 집회에 참석함 / 함께 모여 경배함 / 집회에서 은혜 받음"의 의미로 번역

★ "동역자" / "동역" 관련 입력:
- "동역자"는 항상 영어 "fellow worker" 또는 "fellow workers"로 번역 (복수면 fellow workers)
- ❌ 사용 금지: co-worker, colleague, partner, companion, ministry partner, helper
- ✅ 사용 권장: fellow worker, fellow workers
- 카테고리는 보통 person (또는 wonder — 우연한 만남이면)
- 예: "동역자를 보내주신 것" → "Sent you a fellow worker"
- 예: "좋은 동역자들" → "Sent you fellow workers"
- 예: "동역자와 함께 사역한 것" → "Let you serve with fellow workers"

★ "찬양" / "찬송" / "찬송가" / "워십" / "워십송" / "찬양곡" / "예배곡" 관련 입력:

먼저 의미를 구분해서 처리:

[1] "노래/곡" 의미 (CCM 사용)
- 듣거나 부르는 음악 곡 자체를 가리킬 때만 "CCM"으로 번역
- 트리거: "찬양곡", "찬송가", "워십송", "찬양 듣다/들었다/듣고", "찬양 부르다/불렀다", "새 찬양 만남", 단독 "찬양"·"찬송"·"워십"
- ❌ 금지: hymn, hymns, worship song, worship music, praise song, praise music, gospel song
- ✅ 사용: CCM, a CCM song, CCM music
- 예시:
  • "찬양" / "찬송" / "워십" (단독) → "Sent you CCM"
  • "찬양 듣고 위로받음" → "Comforted you with CCM"
  • "새 찬양곡 만남" → "Sent you a new CCM song"
  • "찬송가 한 곡" → "Sent you a CCM song"

[2] "분위기/열기/임재/시간" 의미 (worship 계열 표현 사용, CCM 금지)
- 노래 자체가 아니라 예배의 열정·감격·분위기·흐름·임재를 가리킬 때
- 트리거: "찬양의 열기", "찬양의 자리", "찬양의 감격", "찬양 가운데", "찬양으로 마음이 뜨거워짐", "찬양 시간", "찬양으로 임재하심", "찬양의 불"
- ✅ 사용 권장: passion of worship, fire of worship, heart of worship, presence in worship, spirit of worship
- ❌ CCM 절대 금지 (이건 노래가 아니라 예배 그 자체임)
- 예시:
  • "찬양의 열기" → "Stirred a passion of worship"
  • "찬양 가운데 임재하심" → "Met you in worship"
  • "찬양의 불이 붙음" → "Lit a fire of worship in you"
  • "찬양 시간이 좋았던 것" → "Filled you with the heart of worship"

- 카테고리 매핑 (OpenTable 영수증 10개 + 기타):
  • life            : 생애 사건 — 출생, 죽음, 임종, 첫 호흡, 구원, 영혼 (일생 1회)
  • physical_care   : 신체적 돌봄 — 안아주심, 업어주심, 먹여주심, 씻겨주심, 키스로 낫게 함
  • emotional_care  : 정서적 위로/경청 — 위로, 응원, 들어주심, 안부 물음, 마음 알아주심
  • growth          : 성장 지원 — 일으켜 세움, 넘어진 후 회복, 시련 통과, 자립 응원
  • protection      : 보호/안전 — 위험에서 건짐, 지켜봐주심, 한밤중 데리러 옴, 살피심
  • guidance        : 일상 조언/리마인드 — 인도, 깨우침, 옳은 길 알려줌, 잔잔한 조언
  • forgiveness     : 관용/용서 — 용서, 너그러움, 봐주심, 다시 받아주심
  • trust           : 신뢰/약속 지킴 — 비밀 지켜주심, 신실하심, 변함없이 함께하심
  • wonder          : 동심/작은 기적 — 우연한 만남, 작은 행운, 신비로운 순간, 천사의 손길
  • ultimate_love   : 궁극적 사랑/우선순위 — 무한 사랑, 우선시, 변함없는 사랑 (신의 사랑은 isInfinite와 연결)
  • other           : 위 10개에 안 맞는 일상의 선물 — 날씨, 음식, 사물, 자연, 일반 만남, 추상 은혜 등

────────────────────────────────────────
[Step 2] Semantic Translator — 의미 중심 번역
────────────────────────────────────────
- 직역 금지. 의도와 카테고리에 맞춰 의미를 옮김
- 신이 행위 주체. 사용자가 한 행위가 아니라 신이 베풀어주신 것으로 해석
- 짧은 영어 동사구 (2~5단어, 동사구, 첫 글자 대문자, 주어 생략)
- 카테고리별 표현 풀 (우선 활용. 의미 맞으면 그대로 사용):
  • life            → "Gave birth to you" / "Granted salvation" / "Carried you" / "Stayed by your side at the end"
  • physical_care   → "Held you" / "Hugged you goodbye" / "Held you too tightly" / "Fed you at 3am" / "Wiped your bum" / "Kissed it better" / "Carried you"
  • emotional_care  → "Wiped your tears" / "Listened" / "Asked if you were okay" / "Knew when you weren't" / "Cheered you on" / "Waited up"
  • growth          → "Helped you stand" / "Watched you fall" / "Picked you back up" / "Picked you up at 3am"
  • protection      → "Checked under the bed" / "Watched over you" / "Picked you up at 3am" / "Kept you safe"
  • guidance        → "Reminded you to take a jumper" / "Gave you the hard truth" / "Whispered the right way" / "Kept it cool when you didn't"
  • forgiveness     → "Forgave you" / "Let you get away with it" / "Kept it cool when you didn't"
  • trust           → "Didn't tell" / "Waited up" / "Kept your secret" / "Stayed when others left"
  • wonder          → "Paid the tooth fairy" / "Sent you a small miracle" / "Slipped joy into your day"
  • ultimate_love   → "Loved you infinitely" / "Put you first" / "Loved you without change"
  • other           → 카테고리에 안 맞는 일상 선물. "Gave you ..." (사물/음식/날씨), "Sent you ..." (사람), "Granted ..." (추상 은혜)
- 음식/식사에 Made/Cooked/Baked 금지. "Provided"는 격식 있어 음식·자원 외엔 자제
- 결과 끝에 "for you" 금지. 대신 "you"를 직접목적어로 쓰거나 생략

★ 우선 활용 표현 풀 (의미 맞으면 그대로 사용):
Carried you / Gave birth to you / Wiped your tears / Fed you at 3am /
Kissed it better / Helped you stand / Watched you fall / Picked you back up /
Checked under the bed / Kept it cool when you didn't / Gave you the hard truth /
Reminded you to take a jumper / Cheered you on / Waited up / Listened /
Forgave you / Let you get away with it / Picked you up at 3am /
Asked if you were okay / Knew when you weren't / Hugged you goodbye /
Held you too tightly / Put you first / Loved you infinitely / Wiped your bum /
Paid the tooth fairy / Didn't tell Dad

────────────────────────────────────────
[Step 3] Native Expression Rewriter — 원어민 다듬기
────────────────────────────────────────
- 영어 원어민이 일상에서 실제로 쓰는 표현으로 보정
- conversational tone (캐주얼하지만 따뜻하고 단정한 어투)
- awkward grammar / 외국인 영어 흔적 제거
- 일상 어휘 우선 (formal한 단어보다 daily usage; "grab" > "take", "great" > "wonderful")
- 영수증 한 줄에 어울리게 짧고 깔끔하게

★ 절대 금지:
- 인터넷 밈, 유행어
- Z세대/Gen-Z slang ("vibes", "lit", "no cap", "slay", "bestie", "lowkey", "iykyk", "bussin", "fire" 등)
- 이모지, 해시태그, 약어 (lol/omg 등)
- 과한 캐주얼 ("yo", "fam", "bro" 등)

────────────────────────────────────────
[oncePerLife 판별]
────────────────────────────────────────
- category가 "life"이면 true
- category가 "care"여도, 입력이 "본인의 일생에 단 한 번뿐인 사건"(출생, 임종, 마지막 숨, 첫 호흡, 죽음의 순간 등)을 묘사하거나 그 곁/과정과 직접 관련되면 true로 강제
  예: "임종 곁에 계셔주신 것", "마지막 순간 함께해주심", "숨 거두실 때 손 잡아주심" → 모두 true
- 그 외엔 false (일상/반복/장기적인 것 포함, "Loved you infinitely"도 false)

────────────────────────────────────────
[isSpecific 판별]  ※ 구체적 단일 항목 / 그 날 하루의 세부 사건 (qty=1)
────────────────────────────────────────
true 조건 — 다음 중 하나라도 해당되면:

(A) 일반 카테고리가 아닌 "특정한 한 가지"를 명시:
- 특정 메뉴: 치킨, 김치찌개, 떡볶이, 비빔밥, 라면, 케이크, 사과, 아메리카노 등 구체 음식명
- 특정 종목: 농구, 축구, 야구, 헬스, 요가, 필라테스, 등산, 수영 등 구체 운동
- 특정 물건: 청바지, 나이키 운동화, 아이폰, 책 제목, 영화 제목, 노래 제목 등 구체 물품/작품
- 특정 장소: 강릉 바다, 한강공원, 우리집 마당 등 고유 장소
- 고유명사가 들어가거나 한 가지 인스턴스로 셀 수 있는 항목

(B) 구체적 시기/맥락이 명시된 사건:
- 시기 마커가 들어가면 무조건 true:
  • 과거: "어제", "그저께", "지난주", "지난달", "작년", "그때", "방금", "아까"
  • 현재: "오늘", "지금", "방금", "이번주", "이번달", "올해"
  • 미래: "내일", "모레", "다음주", "다음달", "내년", "일주일 뒤", "한달 뒤", "곧", "이따"
  • 시간대: "아침에", "점심에", "저녁에", "새벽에", "밤에", "퇴근길에", "출근길에", "수업 중에"
  • 장소 한정: "카페에서", "지하철에서", "강릉에서" 등 특정 장소 명시
- 그 날/그 순간 한정된 1회성 경험 (예: "오늘 길에서 강아지 본 것", "퇴근길 노을이 예뻤던 것", "내일 면접 잘 보게 해주실 것")
- 특정 누군가와의 그 시점 만남/사건 (예: "오늘 카페에서 친구 본 것", "엄마랑 산책한 그 시간")
- 한 장면/한 순간으로 한정되면 isSpecific: true

(C) 특정 행사/이벤트:
- 수련회, 운동회, 여행, 캠프, 워크샵, MT, 콘서트, 결혼식, 장례식, 졸업식, 입학식, 생일, 회식, 모임, 페스티벌, 박람회, 축제, 공연, 전시, 운동 경기, 시험 등
- 이런 이벤트성 단어가 들어가면 시기 마커 없어도 무조건 isSpecific: true (한 회차의 행사로 셀 수 있음)

false 조건 — 일반 카테고리/추상 개념/반복적인 것:
- 음식, 밥, 식사, 식음료 (broad)
- 운동, 스포츠, 활동 (broad)
- 옷, 의류, 신발 (broad)
- 책, 영화, 음악 (broad)
- 자연, 날씨, 햇살, 바람 (시간/장소 한정 없으면 broad)
- 추상 감정/은혜/위로/사랑
- 반복적·지속적 상태 ("매일 깨어나게 해주심", "늘 함께해주심" 등)

────────────────────────────────────────
[isFamilyLove 판별]  ※ qty를 8000~9000 랜덤으로 고정할 항목
────────────────────────────────────────
true 조건 — "가족이 사용자에게 베푼 사랑"을 묘사:
- 사랑의 주체가 가족 구성원이고, "사랑/애정/헌신/돌봄" 등 정서적 표현이 핵심
- 가족 범위: 엄마, 아빠, 부모, 어머니, 아버지, 형, 누나, 언니, 오빠, 동생, 형제, 자매, 자녀, 아들, 딸, 할머니, 할아버지, 조부모, 가족, 친척
- 예: "엄마의 사랑", "아빠의 헌신", "가족의 무조건적인 사랑", "부모님의 끝없는 사랑"

false 조건:
- 가족이 아닌 사람(친구, 동료, 연인 등)의 사랑
- 신의 사랑 (그건 isInfinite로 처리)
- 가족이 한 단순한 행위 (예: "엄마가 밥 차려주신 것" → 가족 행위지 사랑 자체는 아님 → false. care 카테고리)

────────────────────────────────────────
[isInfinite 판별]  ※ qty를 ∞로 표시할 항목
────────────────────────────────────────
true 조건 — "신(God)이 사용자(나)를 직접 사랑하시는 일" 자체를 묘사할 때만:
- 사랑/은혜의 주체가 명확히 신이어야 함 (다른 주체가 명시되면 false)
- 예: "나를 사랑해주심", "한결같이 사랑해주심", "변함없는 사랑", "영원한 사랑", "무조건적인 사랑"
- "끝없는 은혜", "측량할 수 없는 사랑" 등 신의 사랑/은혜의 무한성 표현

false 조건 (반드시 false로 분류):
- 사람 사이의 사랑은 무조건 false (엄마의 사랑, 아빠의 사랑, 부모님의 사랑, 가족의 사랑, 친구의 사랑, 연인의 사랑, 자녀의 사랑 등 — 주체나 주격이 사람이면 그냥 사람의 사랑임. 신이 그 사랑을 보내주신 거여도 이 항목 자체는 false)
- 신이 베푸신 구체적 행위 (안아주심, 들어주심, 응답해주심 등 — 행위는 셀 수 있음)
- 일반적인 "주신 것" 표현 (단순한 감사, 일상 항목)
- "사랑"이라는 단어가 들어있어도 신이 사랑의 주체가 아니면 false

판별 가이드: 입력에 "엄마/아빠/부모/가족/친구/연인/배우자/사람" 등 인간 주체가 명시되면 무조건 isInfinite: false. "(신께서) 나를 사랑해주신 것"처럼 주체가 신일 때만 true.

────────────────────────────────────────
[isPartner 판별]  ※ "타인 공개가 민감한 관계 정보" 전부 포함
────────────────────────────────────────
true 조건 — 다음 중 하나라도 해당되면:
- 현재 연인 / 배우자: 남자친구, 여자친구, 애인, 연인, 남편, 아내, 배우자, 부부, 결혼, 청혼, 데이트, 약혼
- 짝사랑 / 일방적 호감: 짝사랑, 좋아하는 사람, 마음에 둔 사람
- 썸 관계: 썸, 썸타는 사람, 알아가는 중
- 전애인: 전남친, 전여친, 헤어진 사람, 옛 연인, 이별
- 그 외 연애 감정이 얽힌 관계 정보 (고백, 차임, 짝사랑 종료 등)

false 조건:
- 가족 (부모, 형제자매, 자녀, 조부모, 친척)
- 일반 친구, 동료, 지인
- 일반적인 사랑/애정 표현 ("사랑", "Loved you infinitely" 등 추상)
- 단순한 호감/관심 (특정인 지칭 없이 "좋은 사람을 만남" 같은 일반적 표현)

────────────────────────────────────────
[출력 형식] 아래 JSON 한 줄만. 코드펜스/설명/주석 금지.
────────────────────────────────────────
{"intent":"...","category":"life|physical_care|emotional_care|growth|protection|guidance|forgiveness|trust|wonder|ultimate_love|other","translation":"...","oncePerLife":true|false,"isPartner":true|false,"isInfinite":true|false,"isFamilyLove":true|false,"isSpecific":true|false}

[참고 매핑]  ※ category는 11개(life/physical_care/emotional_care/growth/protection/guidance/forgiveness/trust/wonder/ultimate_love/other) 중 가장 잘 맞는 하나
- "태어나게 해주신 것" → {"intent":"생명을 받음","category":"life","translation":"Gave birth to you","oncePerLife":true,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "구원" → {"intent":"영혼 구원","category":"life","translation":"Granted salvation","oncePerLife":true,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "임종 곁에 계셔주신 것" → {"intent":"임종 순간 함께해주심","category":"life","translation":"Stayed by your side at the end","oncePerLife":true,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}

- "안아주신 것" → {"intent":"안아주심","category":"physical_care","translation":"Held you","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "엄마가 밥 차려주신 것" → {"intent":"어머니가 식사를 준비해주심","category":"physical_care","translation":"Fed you with home cooking","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}

- "들어주신 것" → {"intent":"이야기를 들어주심","category":"emotional_care","translation":"Listened","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "눈물을 닦아주신 것" → {"intent":"눈물을 닦아주심","category":"emotional_care","translation":"Wiped your tears","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "응원해주신 것" → {"intent":"응원해주심","category":"emotional_care","translation":"Cheered you on","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}

- "넘어졌을 때 다시 일으켜 주신 것" → {"intent":"넘어졌을 때 일으켜 세워줌","category":"growth","translation":"Picked you back up","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "운동회 잘 끝낸 것" → {"intent":"운동회를 잘 마침","category":"growth","translation":"Carried you through the sports day","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":true}

- "수련회 무사히 다녀온 것" → {"intent":"수련회를 무사히 다녀옴","category":"protection","translation":"Brought you safely through the retreat","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":true}
- "여행 잘 다녀온 것" → {"intent":"여행을 잘 다녀옴","category":"protection","translation":"Watched over your journey","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":true}
- "한밤중에 데리러 오심" → {"intent":"한밤중에 데리러 오심","category":"protection","translation":"Picked you up at 3am","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}

- "옳은 길 알려주신 것" → {"intent":"옳은 길로 인도하심","category":"guidance","translation":"Whispered the right way","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "쓴소리를 해주신 것" → {"intent":"솔직한 진실을 들려주심","category":"guidance","translation":"Gave you the hard truth","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}

- "용서해주신 것" → {"intent":"용서받음","category":"forgiveness","translation":"Forgave you","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "전남친과 잘 헤어진 것" → {"intent":"전 연인과 잘 마무리함","category":"forgiveness","translation":"Granted you a clean goodbye","oncePerLife":false,"isPartner":true,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}

- "비밀을 지켜주신 것" → {"intent":"비밀을 지켜주심","category":"trust","translation":"Kept your secret","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "포기하지 않으신 것" → {"intent":"끝까지 곁에 있어주심","category":"trust","translation":"Stayed when others left","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}

- "강릉 바다를 보게 해주신 것" → {"intent":"강릉 바다를 봄","category":"wonder","translation":"Gave you the sea at Gangneung","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":true}
- "오늘 길에서 강아지 본 것" → {"intent":"길에서 강아지를 봄","category":"wonder","translation":"Sent you a puppy on the street","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":true}
- "퇴근길 노을이 예뻤던 것" → {"intent":"퇴근길 노을을 봄","category":"wonder","translation":"Painted you a sunset on the way home","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":true}
- "오늘 친구를 카페에서 만난 것" → {"intent":"오늘 카페에서 친구를 만남","category":"wonder","translation":"Brought a friend to your table","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":true}

- "나를 사랑해주신 것" → {"intent":"신의 무한한 사랑을 받음","category":"ultimate_love","translation":"Loved you infinitely","oncePerLife":false,"isPartner":false,"isInfinite":true,"isFamilyLove":false,"isSpecific":false}
- "변함없는 사랑" → {"intent":"변함없는 사랑을 받음","category":"ultimate_love","translation":"Loved you without change","oncePerLife":false,"isPartner":false,"isInfinite":true,"isFamilyLove":false,"isSpecific":false}
- "늘 나를 우선시 해주신 것" → {"intent":"늘 나를 우선시 해주심","category":"ultimate_love","translation":"Put you first","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}

- "좋은 날씨를 허락하신 것" → {"intent":"좋은 날씨를 받음","category":"other","translation":"Gave you good weather","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "마음의 평안" → {"intent":"평안을 받음","category":"other","translation":"Granted you peace","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "엄마의 사랑" → {"intent":"어머니의 사랑을 받음","category":"other","translation":"Sent you your mother's love","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":true,"isSpecific":false}
- "가족의 무조건적인 사랑" → {"intent":"가족의 무조건적인 사랑을 받음","category":"other","translation":"Sent you your family's love","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":true,"isSpecific":false}
- "남자친구를 보내주신 것" → {"intent":"남자친구를 만남","category":"other","translation":"Sent you a partner","oncePerLife":false,"isPartner":true,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "맛있는 음식" → {"intent":"맛있는 음식을 받음","category":"other","translation":"Gave you a great meal","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "치킨을 먹게 해주신 것" → {"intent":"치킨을 받음","category":"other","translation":"Gave you chicken","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":true}
- "옷을 사주신 것" → {"intent":"옷을 받음","category":"other","translation":"Gave you new clothes","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "찬양" → {"intent":"찬양을 받음","category":"other","translation":"Sent you CCM","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "동역자를 보내주신 것" → {"intent":"동역자를 받음","category":"other","translation":"Sent you a fellow worker","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "좋은 동역자들" → {"intent":"좋은 동역자들을 받음","category":"other","translation":"Sent you fellow workers","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "찬송가 한 곡" → {"intent":"찬송가 한 곡을 받음","category":"other","translation":"Sent you a CCM song","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":true}
- "찬양의 열기" → {"intent":"찬양의 열정을 받음","category":"other","translation":"Stirred a passion of worship","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "찬양 가운데 임재하심" → {"intent":"찬양 가운데 임재하심","category":"other","translation":"Met you in worship","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "찬양 시간이 좋았던 것" → {"intent":"찬양 시간이 충만함","category":"other","translation":"Filled you with the heart of worship","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":true}
- "찬양의 불이 붙음" → {"intent":"찬양의 불이 붙음","category":"other","translation":"Lit a fire of worship in you","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
- "카운트다운 예배 잘 다녀온 것" → {"intent":"카운트다운 예배에 참석함","category":"other","translation":"Brought you to Countdown to worship","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":true}
- "Countdown 2026 다녀온 것" → {"intent":"Countdown 2026 예배에 참석함","category":"other","translation":"Brought you to Countdown 2026 to worship","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":true}
- "매일 깨어나게 해주심" → {"intent":"매일 깨어남","category":"other","translation":"Woke you each morning","oncePerLife":false,"isPartner":false,"isInfinite":false,"isFamilyLove":false,"isSpecific":false}
`,
          },
          {
            type: 'text',
            text: `입력: ${text}\n출력:`,
          },
        ],
      },
    ],
  });
  const raw = message.content[0].text.trim();
  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : cleaned);
  const result = {
    translation: String(parsed.translation || '').trim().replace(/^["']|["']$/g, ''),
    oncePerLife: !!parsed.oncePerLife,
    isPartner: !!parsed.isPartner,
    isInfinite: !!parsed.isInfinite,
    isFamilyLove: !!parsed.isFamilyLove,
    isSpecific: !!parsed.isSpecific,
    intent: parsed.intent || null,
    category: parsed.category || null,
  };
  const tags = [
    result.isInfinite && 'infinite',
    result.isPartner && 'partner',
    result.isFamilyLove && 'familyLove',
    result.oncePerLife && 'once',
    result.isSpecific && 'specific',
  ].filter(Boolean).join(',');
  console.log(`[translate] "${text}" → ${result.category}${tags ? '/' + tags : ''} | ${result.intent} | ${result.translation}`);
  return result;
}

module.exports = { translateToEnglish };
