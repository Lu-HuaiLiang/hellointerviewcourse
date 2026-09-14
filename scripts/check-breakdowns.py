#!/usr/bin/env python3
"""Verify the public breakdown URL inventory against the built original course.

Only metadata is retained. No cookies, premium access, or article archiving.
Run after npm run build; network failures always make the audit fail.
"""
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import sys
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://www.hellointerview.com'
PREFIX = '/learn/system-design/problem-breakdowns/'
SEED = BASE + PREFIX + 'bitly'
SITEMAP = BASE + '/sitemap.xml'
STAGES = ['需求边界', '实体与接口', '基础架构', '扩展瓶颈', '故障处理']


def normalize(value):
    u = urlsplit(urljoin(BASE, value))
    if u.hostname != 'www.hellointerview.com' or not u.path.startswith(PREFIX):
        return None
    path = u.path.rstrip('/')
    if not path[len(PREFIX):] or '/' in path[len(PREFIX):]:
        return None
    return urlunsplit(('https', u.netloc, path, '', ''))


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = set()
        self.title = []
        self.in_h1 = False
        self.premium_notice = False

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            link = normalize(dict(attrs).get('href', ''))
            if link:
                self.links.add(link)
        if tag == 'h1':
            self.in_h1 = True

    def handle_endtag(self, tag):
        if tag == 'h1':
            self.in_h1 = False

    def handle_data(self, value):
        if self.in_h1:
            self.title.append(value)
        if 'Purchase Premium to Keep Reading' in value:
            self.premium_notice = True


def fetch(url):
    with urlopen(Request(url, headers={'User-Agent': 'SystemDesignCourseCoverage/1.0'}), timeout=40) as response:
        return response.status, response.url, response.read()


def inspect(url):
    try:
        status, resolved, raw = fetch(url)
        p = Metadata()
        p.feed(raw.decode('utf-8'))
        return {'url': url, 'status': status, 'resolved': resolved,
                'title': ''.join(p.title).strip(), 'premium_notice': p.premium_notice,
                'discovered_links': sorted(p.links)}
    except Exception as error:
        return {'url': url, 'error': str(error), 'discovered_links': []}


def complete(lesson):
    return bool(lesson and lesson.get('kind') == 'case' and lesson.get('scene')
                and lesson.get('entity') and lesson.get('api')
                and [d.get('stage') for d in lesson.get('decisions', [])] == STAGES
                and all(len(d.get('options', [])) == 2
                        and sum(o.get('preferred', False) for o in d['options']) == 1
                        and all(o.get('feedback') and len(o.get('path', [])) >= 2 for o in d['options'])
                        for d in lesson['decisions'])
                and len(lesson.get('questions', [])) >= 3
                and all(sum(o.get('correct', False) for o in q.get('options', [])) == 1
                        and all(o.get('feedback') for o in q['options']) for q in lesson['questions'])
                and len(lesson.get('summary', [])) >= 3
                and len(lesson.get('reading', {}).get('sections', [])) == 7
                and all(section.get('blocks') for section in lesson['reading']['sections']))


def main():
    course_bytes = (ROOT / 'artifacts/curriculum.json').read_bytes()
    course = json.loads(course_bytes)
    catalog = json.loads((ROOT / 'src/content/catalog.json').read_text())
    local_entries = [e for e in catalog['lessons'] if normalize(e['url'])]
    local = {normalize(e['url']): e for e in local_entries}
    lessons = {l['id']: l for l in course['lessons']}
    errors, sitemap_urls = [], set()
    try:
        _, _, raw = fetch(SITEMAP)
        sitemap_urls = {u for e in ET.fromstring(raw).iter()
                        if e.tag.endswith('}loc') and (u := normalize(e.text or ''))}
        if not sitemap_urls:
            errors.append('Sitemap contained no breakdown URLs')
    except Exception as error:
        errors.append('Sitemap: ' + str(error))
    seed = inspect(SEED)
    records = {SEED: seed}
    discovered = set(seed['discovered_links']) | sitemap_urls | {SEED}
    if not seed['discovered_links']:
        errors.append('Seed page contained no breakdown links')
    # Follow every public page until the URL set stabilizes. Check local-only URLs too.
    pending = (discovered | set(local)) - set(records)
    while pending:
        if len(records) + len(pending) > 100:
            errors.append('Unexpected inventory size; manual inspection required')
            break
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            for record in pool.map(inspect, sorted(pending)):
                records[record['url']] = record
                discovered.update(record['discovered_links'])
                print(f"Checked {len(records)}: {record['url'].rsplit('/', 1)[-1]}", flush=True)
        pending = discovered - set(records)
    rows = []
    for url in sorted(discovered | set(local)):
        remote = records.get(url, {'url': url, 'error': 'Not checked'})
        entry = local.get(url)
        lesson = lessons.get(entry['slug']) if entry else None
        is_complete = complete(lesson)
        remote_ok = remote.get('status') == 200 and normalize(remote.get('resolved', '')) == url and bool(remote.get('title'))
        if not remote_ok:
            errors.append('Page failed: ' + url)
        if not is_complete:
            errors.append('Incomplete local case: ' + url)
        rows.append({**remote, 'in_sitemap': url in sitemap_urls,
                     'in_public_inventory': url in discovered,
                     'local_id': lesson['id'] if lesson else None,
                     'local_complete': is_complete,
                     'decisions': len(lesson.get('decisions', [])) if lesson else 0,
                     'questions': len(lesson.get('questions', [])) if lesson else 0})
    if len(local_entries) != len(local):
        errors.append('Duplicate local catalog URLs')
    if len(lessons) != len(course['lessons']):
        errors.append('Duplicate lesson IDs')
    extras = sorted(set(local) - discovered)
    if extras:
        errors.append('Local cases absent from current public inventory')
    report = {'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'scope': 'Public problem-breakdowns topic coverage, not full article/paid-section coverage',
              'seed': SEED, 'sitemap': SITEMAP, 'sitemap_count': len(sitemap_urls),
              'public_count': len(discovered), 'local_count': len(local),
              'covered_count': sum(r['local_complete'] and r['in_public_inventory'] for r in rows),
              'curriculum_sha256': hashlib.sha256(course_bytes).hexdigest(),
              'missing': sorted(discovered - set(local)), 'extra': extras,
              'errors': errors, 'passed': not errors, 'pages': rows}
    (ROOT / 'artifacts/problem-breakdowns-coverage.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    notes_dir = ROOT / 'problem-breakdowns'
    notes_dir.mkdir(exist_ok=True)
    table = ['# Problem Breakdowns 覆盖清单', '',
             f"核验时间：{report['checked_at']}。公开目录 {len(discovered)} 题；本地 {len(local)} 题；核验{'通过' if not errors else '未通过'}。", '',
             f'[原站入口]({SEED}) · [站点地图]({SITEMAP}) · [机器可读报告](../artifacts/problem-breakdowns-coverage.json)', '',
             f'站点地图仅含 {len(sitemap_urls)} 题；完整清单来自入口页导航、站点地图及逐页链接的并集。', '',
             '覆盖指每道题都有原创中文场景、实体与接口、独立概念讲解、具体例子、适用边界、五个设计决策、路径图、可选自测及总结；不表示复刻原站全文或覆盖其每一项深入讨论。Premium 提示只记录公开页面显示的状态，未核验付费正文。', '',
             '以下笔记在构建时从网页同一份课程内容导出。打开根目录的 index.html，可连续阅读并使用互动实验。', '',
             '| 题目 | 中文笔记 | 设计决策 | 判断题 | 页面状态 |',
             '| --- | --- | ---: | ---: | --- |']
    for row in rows:
        lesson = lessons.get(row['local_id'])
        label = lesson['en'] if lesson else row.get('title') or row['url'].rsplit('/', 1)[-1]
        note_link = f"[{lesson['title']}]({lesson['id']}.md)" if lesson else '缺失'
        state = '200 · Premium 提示' if row.get('premium_notice') else str(row.get('status', '失败'))
        table.append(f"| [{label}]({row['url']}) | {note_link} | {row['decisions']} | {row['questions']} | {state} |")
        if not lesson:
            continue
    if errors:
        table.extend(['', '## 尚未通过', ''] + ['- ' + e for e in errors])
    (notes_dir / 'README.md').write_text('\n'.join(table) + '\n')
    print(json.dumps({k: report[k] for k in ['public_count', 'local_count', 'covered_count', 'passed', 'errors']}, ensure_ascii=False))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
