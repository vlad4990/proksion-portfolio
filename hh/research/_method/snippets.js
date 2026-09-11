// hh/research/_method/snippets.js
// Проверенные сниппеты сбора данных hh.ru через Chrome MCP (javascript_tool), прогон 2026-08-14 / 2026-09-11.
// ОГРАНИЧЕНИЯ ИНСТРУМЕНТА (важно):
//  - вывод javascript_tool обрезается ~1500 символов ([TRUNCATED]) — выгружать порциями ≤13 строк / компактные агрегаты;
//  - вывод, содержащий query-строки (?a=b) или похожее на куки, блокируется целиком ([BLOCKED]) — не возвращать URL с параметрами;
//  - таймаут одного вызова 45 с — циклы fetch длиннее ~30 с запускать fire-and-forget (см. §4) и поллить счётчик через computer.wait;
//  - api.hh.ru из страницы отдаёт 403 — использовать fetch HTML-страниц hh.ru + DOMParser;
//  - window.* живёт пока открыта вкладка: не закрывать/не перезагружать вкладку до выгрузки агрегатов.

// ---------- §1. Парсер карточек листинга ----------
window.__parseDoc = (doc) => {
  const cards = doc.querySelectorAll('[data-qa="vacancy-serp__vacancy"]');
  return [...cards].map(c => {
    const t = c.querySelector('[data-qa="serp-item__title"]')?.textContent.trim() || '';
    const deep = [...c.querySelectorAll('*')].filter(e => e.textContent.includes('₽') && ![...e.children].some(ch => ch.textContent.includes('₽')));
    let sal = '';
    if (deep.length) { const p = deep[0].parentElement; sal = (p ? p.textContent : deep[0].textContent).replace(/\s+/g, ' ').trim().slice(0, 70); }
    const expEl = [...c.querySelectorAll('*')].filter(e => /^Опыт\s/.test(e.textContent.trim()) && e.textContent.length < 25).pop();
    const exp = expEl ? expEl.textContent.trim().replace(/^Опыт\s/, '') : '';
    const comp = c.querySelector('[data-qa="vacancy-serp__vacancy-employer"]')?.textContent.trim() || '';
    const a = c.querySelector('a[data-qa="serp-item__title"]');
    const id = a ? new URL(a.getAttribute('href'), 'https://hh.ru').pathname.replace('/vacancy/', '') : '';
    const addr = c.querySelector('[data-qa="vacancy-serp__vacancy-address"]')?.textContent.trim() || '';
    return [t, sal, exp, comp, addr, id].join(' ~ ');   // строка: title ~ salary ~ exp ~ company ~ addr ~ id
  });
};

// ---------- §2. Нормализация зарплаты → net («на руки»), gross×0.87, точка = середина вилки ----------
window.__parseSal = (s) => {
  if (!s || !s.includes('₽')) return null;
  const nums = (s.match(/\d[\d\s  ]*\d|\d+/g) || []).map(x => parseInt(x.replace(/\D/g, '')));
  if (!nums.length) return null;
  const net = /на руки/.test(s);
  let from = null, to = null;
  if (nums.length >= 2) { from = nums[0]; to = nums[1]; }
  else if (/от/.test(s)) from = nums[0];
  else if (/до/.test(s)) to = nums[0];
  else from = nums[0];
  const k = net ? 1 : 0.87;
  const mid = from && to ? (from + to) / 2 : (from || to);
  return { from: from ? Math.round(from * k) : null, to: to ? Math.round(to * k) : null, mid: Math.round(mid * k) };
};

// ---------- §3. Сбор листинга (≤8 страниц за вызов, иначе таймаут) ----------
// Кол-во страниц: [...document.querryAll('[data-qa="pager-page"]')].map(e=>e.textContent) — последнее число = всего страниц.
// Пагинация: ?page=N, 0-based. Лендинги /vacancies/... — 50/стр, /search/vacancy — 20/стр.
// window.__ALL = [];
// for (let p = 0; p < 8; p++) {
//   const html = await fetch(location.pathname + '?page=' + p, { credentials: 'include' }).then(r => r.text());
//   window.__ALL.push(...window.__parseDoc(new DOMParser().parseFromString(html, 'text/html')));
//   await new Promise(r => setTimeout(r, 400));
// }
// дедуп: const seen=new Set(); window.__ALL = window.__ALL.filter(r=>{const id=r.split(' ~ ').pop(); if(seen.has(id)) return false; seen.add(id); return true;});

// ---------- §4. Страница вакансии + fire-and-forget сборщик ----------
window.__fetchVac = async (id) => {
  const html = await fetch('/vacancy/' + id, { credentials: 'include' }).then(r => r.text());
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const q = (s) => doc.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() || '';
  return {
    id,
    title: q('[data-qa="vacancy-title"]'),
    salary: q('[data-qa="vacancy-salary"]'),
    exp: q('[data-qa="vacancy-experience"]'),
    employment: q('[data-qa="common-employment-text"]'),
    workFormat: q('[data-qa="work-formats-text"]').replace('Формат работы: ', ''),
    company: q('[data-qa="vacancy-company-name"]'),
    skills: [...doc.querySelectorAll('[data-qa="skills-element"]')].map(e => e.textContent.trim()),
    desc: q('[data-qa="vacancy-description"]'),
    archived: /вакансия в архиве|Вакансия закрыта|не найдена/i.test(doc.body?.textContent || '') || !q('[data-qa="vacancy-title"]'),
  };
};
// Запуск (НЕ await'ить в конце — вернуть 'started'), потом поллить: JSON.stringify({done: window.__DETAILS.length, fin: !!window.__DONE})
// window.__DETAILS = []; window.__IDS = window.__ALL.filter((_, i) => i % 6 === 0).map(r => r.split(' ~ ').pop());
// (async () => { for (const id of window.__IDS) { try { window.__DETAILS.push(await window.__fetchVac(id)); } catch (e) { window.__DETAILS.push({ id, err: e.message }); } await new Promise(r => setTimeout(r, 250)); } window.__DONE = true; })(); 'started';
// ~115 вакансий ≈ 90–120 с. Дедуп по id после завершения.

// ---------- §5. Агрегаты (считать В БРАУЗЕРЕ, выгружать JSON) ----------
window.__stat = (arr) => { arr = [...arr].sort((a, b) => a - b); const q = p => arr[Math.floor(arr.length * p)]; return { n: arr.length, min: arr[0], p25: q(0.25), median: q(0.5), p75: q(0.75), p90: q(0.9), max: arr[arr.length - 1] }; };
window.__hist = (mids) => { const b = { '<60k': 0, '60-80k': 0, '80-100k': 0, '100-120k': 0, '120-150k': 0, '150-200k': 0, '200k+': 0 }; mids.forEach(m => { if (m < 60000) b['<60k']++; else if (m < 80000) b['60-80k']++; else if (m < 100000) b['80-100k']++; else if (m < 120000) b['100-120k']++; else if (m < 150000) b['120-150k']++; else if (m < 200000) b['150-200k']++; else b['200k+']++; }); return b; };
window.__SEG = {   // сегменты по заголовку (segments_by_title и by_segment_median)
  'смм/креативы/реклама': /smm|смм|креатив|реклам|баннер/i,
  'lead/senior/арт-дир': /lead|ведущ|главн|senior|арт-дирек|art dir/i,
  'веб/digital/ux-ui': /ux|ui|веб|web|digital|диджитал|сайт/i,
  'маркетплейсы/инфографика': /маркетплейс|инфографик|wildberries|ozon|карточк/i,
  'ai в названии': /\bai\b|нейросет|ии-|midjourney/i,
  'junior': /junior|младш|начинающ|стажер|стажёр/i,
  'брендинг/айдентика': /бренд|айдентик|фирменн/i,
  'презентации': /презентаци/i,
  'полиграфия/вёрстка': /полиграф|верстк|вёрстк|печат|типограф/i,
  'motion/анимация': /motion|моушн|анимаци|видео/i,
  'иллюстрация': /иллюстр|художник/i,
};
window.__TERMS = {   // tools_mentions по desc+skills глубокой выборки
  photoshop: /photoshop|фотошоп/i, illustrator: /illustrator|иллюстратор(?!ы)/i, figma: /figma|фигм/i,
  indesign: /indesign/i, after_effects: /after effects|афтер/i, premiere: /premiere/i, corel: /corel/i,
  powerpoint: /powerpoint|power point/i, tilda: /tilda|тильд/i, blender_c4d_3d: /blender|cinema 4d|c4d|3ds max|3d[- ]/i,
  ai_tools: /нейросет|midjourney|stable diffusion|chatgpt|dall[·\- ]?e|генеративн|\bAI\b|ИИ[\s,.:;)]|искусственн\w+ интеллект/,  // БЕЗ флага i! «ии » матчит окончания
  motion: /motion|моушн|анимаци/i, video: /видео(?!набл)/i,
  marketplace: /маркетплейс|wildberries|ozon|вайлдберриз/i, infographics: /инфографик/i,
  branding: /айдентик|фирменн\w+ стил|брендбук|логотип/i, presentation: /презентаци/i,
  smm: /smm|смм|соцсет|социальн\w+ сет/i, banners: /баннер/i, polygraphy: /полиграф|печатн/i,
  retouch: /ретушь|ретуширован/i, typography: /типографик/i, layout_verstka: /верстк|вёрстк/i,
  illustration: /иллюстраци/i, ux_ui: /\b(ux|ui)\b|ux\/ui|ui\/ux/i, packaging: /упаковк/i, pos: /pos[- ]материал/i,
  portfolio: /портфолио/i, test_task: /тестовое задани/i, higher_education: /высшее.{0,30}образовани|образование.{0,20}высшее/i,
};
// Пример: const D=window.__DETAILS.filter(d=>!d.err&&d.title); const tc={}; D.forEach(d=>{const txt=d.desc+' '+d.skills.join(' '); for(const [k,re] of Object.entries(window.__TERMS)) if(re.test(txt)) tc[k]=(tc[k]||0)+1;}); JSON.stringify(tc)

// ---------- §6. Фильтр кандидатов для Кристины ----------
window.__BAD = /lead|ведущ|главн|senior|арт-дирек|art dir|интерьер|мебел|ландшафт|ювелир|тату|маникюр|печат(ник|и)|продавец|склад|преподават|учитель|гейм|game/i;
window.__GOOD = /дизайнер|дизайн|designer/i;
// const rows = window.__ALL.map(r=>{const [t,s,e,c,a,id]=r.split(' ~ '); return {t,s,e,c,id,sal:window.__parseSal(s)};});
// window.__CAND = rows.filter(r=>(r.e==='1-3 года'||r.e==='')&&window.__GOOD.test(r.t)&&!window.__BAD.test(r.t)&&r.sal&&r.sal.mid>=85000);
// Выгрузка порциями ≤13 строк: window.__CAND.map((r,i)=>i+'|'+r.t.slice(0,46)+'|'+(r.s||'').replace(' за месяц','').replace(', на руки','(н)').replace(', до вычета налогов','(г)').replace(/\s/g,'')+'|'+(r.c||'').slice(0,20)+'|'+r.id).slice(0,13).join('\n')

// ---------- §7. Проверка живости прошлых вакансий ----------
// window.__LIVE={}; for (const id of [/* ids */]) { const v = await window.__fetchVac(String(id)); window.__LIVE[id] = v.archived ? 'archived' : 'live'; await new Promise(r=>setTimeout(r,250)); } JSON.stringify(window.__LIVE)
