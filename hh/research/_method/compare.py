#!/usr/bin/env python3
"""Сравнение двух снапшотов hh-исследования: python3 compare.py research/2026-08-14/snapshot.json research/2026-09-11/snapshot.json"""
import json, sys

def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)

def get(d, *path, default=None):
    for k in path:
        if not isinstance(d, dict) or k not in d:
            return default
        d = d[k]
    return d

def fmt_delta(a, b, pct=False):
    if a is None or b is None:
        return "—"
    d = b - a
    s = f"{d:+,}".replace(",", " ")
    if pct and a:
        s += f" ({d / a * 100:+.0f}%)"
    return s

def row(name, a, b, pct=True):
    fa = "—" if a is None else f"{a:,}".replace(",", " ")
    fb = "—" if b is None else f"{b:,}".replace(",", " ")
    print(f"| {name} | {fa} | {fb} | {fmt_delta(a, b, pct)} |")

def header(title, da, db):
    print(f"\n### {title}\n")
    print(f"| Показатель | {da} | {db} | Δ |")
    print("|---|---|---|---|")

def main(old_p, new_p):
    o, n = load(old_p), load(new_p)
    da, db = get(o, "meta", "date"), get(n, "meta", "date")

    header("Объём рынка", da, db)
    for k, label in [("main_unique", "Вакансий в основной выдаче"), ("main_with_salary", "…с указанной зарплатой"),
                     ("remote_pool_unique", "Удалённых вакансий (пул)"), ("remote_with_salary", "…с зарплатой")]:
        row(label, get(o, "meta", "counts", k), get(n, "meta", "counts", k))

    header("Зарплаты, на руки (весь рынок)", da, db)
    for k in ["p25", "median", "p75", "p90"]:
        row(k, get(o, "salary_net", "overall", k), get(n, "salary_net", "overall", k))

    header("Зарплаты по опыту (медиана)", da, db)
    exps = set(get(o, "salary_net", "by_experience", default={})) | set(get(n, "salary_net", "by_experience", default={}))
    for e in sorted(exps):
        row(e, get(o, "salary_net", "by_experience", e, "median"), get(n, "salary_net", "by_experience", e, "median"))

    header("Когорта 1–3 года (Кристина)", da, db)
    for k in ["p25", "median", "p75"]:
        row(k, get(o, "salary_net", "by_experience", "1-3 года", k), get(n, "salary_net", "by_experience", "1-3 года", k))

    header("Медиана по сегментам", da, db)
    segs = set(get(o, "salary_net", "by_segment_median", default={})) | set(get(n, "salary_net", "by_segment_median", default={}))
    for s in sorted(segs):
        row(s, get(o, "salary_net", "by_segment_median", s, "median"), get(n, "salary_net", "by_segment_median", s, "median"))

    header("Сегменты по заголовкам (число вакансий)", da, db)
    segs = set(get(o, "segments_by_title", default={})) | set(get(n, "segments_by_title", default={}))
    for s in sorted(segs):
        row(s, get(o, "segments_by_title", s), get(n, "segments_by_title", s))

    # deep sample: ключ секции может отличаться (deep_sample_113 / deep_sample_NN)
    def deep(d):
        for k in d:
            if k.startswith("deep_sample"):
                return d[k], k
        return {}, None
    do, ko = deep(o); dn, kn = deep(n)
    no = int(ko.split("_")[-1]) if ko and ko.split("_")[-1].isdigit() else get(do, "n")
    nn = int(kn.split("_")[-1]) if kn and kn.split("_")[-1].isdigit() else get(dn, "n")
    header(f"Требования в описаниях, % вакансий глубокой выборки (n={no} → n={nn})", da, db)
    terms = set(get(do, "tools_mentions", default={})) | set(get(dn, "tools_mentions", default={}))
    def pct(d, n_, t):
        v = get(d, "tools_mentions", t)
        return None if v is None or not n_ else round(v / n_ * 100)
    rows = [(t, pct(do, no, t), pct(dn, nn, t)) for t in terms]
    rows.sort(key=lambda r: -(r[2] if r[2] is not None else -1))
    for t, a, b in rows:
        row(t, a, b, pct=False)
    header("Прочие требования, % выборки", da, db)
    for t in ["portfolio", "test_task", "higher_education"]:
        a = get(do, "requirements", t); b = get(dn, "requirements", t)
        row(t, None if a is None or not no else round(a / no * 100), None if b is None or not nn else round(b / nn * 100), pct=False)

    # remote
    def remote(d):
        for k in d:
            if k.startswith("remote_pool"):
                return d[k]
        return {}
    ro, rn = remote(o), remote(n)
    header("Удалённый сегмент, на руки", da, db)
    for k in ["p25", "median", "p75"]:
        row(k, get(ro, "salary_net", k), get(rn, "salary_net", k))
    row("медиана 1–3 года", get(ro, "by_experience_median", "1-3 года", "median"), get(rn, "by_experience_median", "1-3 года", "median"))
    row("кандидатов 1–3 г., ≥85к", get(ro, "candidates_1_3y_85k_plus"), get(rn, "candidates_1_3y_85k_plus"))

    live = get(n, "liveness_prev_shortlist")
    if live:
        alive = sum(1 for v in live.values() if v == "live")
        print(f"\n### Живость прошлого шорт-листа\n\n{alive} из {len(live)} вакансий снапшота {da} ещё открыты на {db}.")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
