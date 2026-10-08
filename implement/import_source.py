"""Pin and unpack a GitHub source archive into implement/ with a license record."""
import hashlib
import io
import json
import os
from pathlib import Path
import re
import sys
import urllib.request
import urllib.parse
import zipfile

ROOT = Path(__file__).resolve().parent
CATALOG = ROOT / 'catalog.json'
API = 'https://api.github.com'


def request(url):
    headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'ai-corp-local',
               'X-GitHub-Api-Version': '2022-11-28'}
    if os.getenv('AI_CORP_GITHUB_TOKEN'):
        headers['Authorization'] = 'Bearer ' + os.environ['AI_CORP_GITHUB_TOKEN']
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as response:
        return response.read()


def main():
    if len(sys.argv) != 3 or not re.fullmatch(r'[\w.-]+/[\w.-]+', sys.argv[1]):
        raise SystemExit('Kullanım: python implement/import_source.py owner/repo ref')
    repo, ref = sys.argv[1:]
    if not re.fullmatch(r'[\w./-]{1,100}', ref) or '..' in ref:
        raise SystemExit('Geçersiz ref')
    encoded_ref = urllib.parse.quote(ref, safe='')
    commit = json.loads(request(f'{API}/repos/{repo}/commits/{encoded_ref}'))['sha']
    license_info = json.loads(request(f'{API}/repos/{repo}/license?ref={commit}'))
    spdx = (license_info.get('license') or {}).get('spdx_id')
    if not spdx or spdx == 'NOASSERTION':
        raise SystemExit('Lisans doğrulanamadı; kaynak otomatik içe aktarılamaz.')
    archive = request(f'{API}/repos/{repo}/zipball/{commit}')
    digest = hashlib.sha256(archive).hexdigest()
    slug = repo.replace('/', '__') + '__' + commit[:12]
    archive_path = ROOT / 'archives' / (slug + '.zip')
    target = ROOT / 'extracted' / slug
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    target.mkdir(parents=True, exist_ok=True)
    archive_path.write_bytes(archive)
    with zipfile.ZipFile(io.BytesIO(archive)) as source:
        members = source.infolist()
        if len(members) > 20000 or sum(item.file_size for item in members) > 512 * 1024 * 1024:
            raise SystemExit('Arşiv güvenli boyut sınırını aşıyor.')
        prefix = members[0].filename.split('/')[0] + '/'
        for member in members:
            relative = member.filename.removeprefix(prefix)
            if not relative or member.is_dir():
                continue
            destination = (target / relative).resolve()
            if not destination.is_relative_to(target.resolve()) or (member.external_attr >> 16) & 0o170000 == 0o120000:
                raise SystemExit('Arşivde güvensiz dosya yolu veya sembolik bağlantı var.')
            destination.parent.mkdir(parents=True, exist_ok=True)
            with source.open(member) as src, destination.open('wb') as dst:
                while chunk := src.read(1024 * 1024):
                    dst.write(chunk)
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    items = catalog if isinstance(catalog, list) else catalog.setdefault('items', [])
    entry = {'repository': repo, 'commit': commit, 'license_spdx': spdx,
             'license_url': license_info.get('html_url'), 'archive_sha256': digest,
             'archive': str(archive_path.relative_to(ROOT)).replace('\\', '/'),
             'extracted': str(target.relative_to(ROOT)).replace('\\', '/'),
             'copied_files': []}
    items = [item for item in items if item.get('repository') != repo or item.get('commit') != commit] + [entry]
    if isinstance(catalog, list):
        catalog = items
    else:
        catalog['items'] = items
    temporary = CATALOG.with_suffix('.tmp')
    temporary.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(CATALOG)
    print(json.dumps(entry, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
