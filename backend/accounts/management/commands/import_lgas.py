from django.core.management.base import BaseCommand
import json
import os
from typing import Dict, List

try:
    # Prefer urllib to avoid adding new requirements
    from urllib.request import urlopen
except Exception:
    urlopen = None

from accounts.models import LGA
from accounts import lgas as lgas_module


class Command(BaseCommand):
    help = 'Import LGAs from a JSON file or URL, or export current STATE_LGAS to a file.'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, help='Path to JSON file to import')
        parser.add_argument('--url', type=str, help='URL to fetch JSON from (raw GitHub URL)')
        parser.add_argument('--export', type=str, help='Export current STATE_LGAS to given file path')

    def handle(self, *args, **options):
        export_path = options.get('export')
        file_path = options.get('file')
        url = options.get('url')

        if export_path:
            with open(export_path, 'w', encoding='utf-8') as f:
                json.dump(lgas_module.STATE_LGAS, f, ensure_ascii=False, indent=2)
            self.stdout.write(self.style.SUCCESS(f'Exported STATE_LGAS to {export_path}'))
            return

        if not file_path and not url:
            self.stdout.write(self.style.ERROR('Provide --file or --url to import, or --export to export.'))
            return

        data = None
        if file_path:
            if not os.path.exists(file_path):
                self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
                return
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            if urlopen is None:
                self.stdout.write(self.style.ERROR('urllib not available to fetch URL'))
                return
            try:
                resp = urlopen(url)
                content = resp.read().decode('utf-8')
                data = json.loads(content)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Failed to fetch/parse JSON from URL: {e}'))
                return

        # Expecting data to be a mapping: { state_code: [ {value,label}, ... ], ... }
        total_new = 0
        total_updated = 0
        for state_code, entries in (data or {}).items():
            if not isinstance(entries, list):
                continue
            for entry in entries:
                value = entry.get('value')
                label = entry.get('label')
                if not value or not label:
                    continue
                obj, created = LGA.objects.update_or_create(
                    state_code=state_code,
                    value=value,
                    defaults={'label': label}
                )
                if created:
                    total_new += 1
                else:
                    total_updated += 1

        self.stdout.write(self.style.SUCCESS(f'Imported LGAs. New: {total_new}, Updated: {total_updated}'))
