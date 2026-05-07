from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.core.management.commands.runserver import Command as OriginalRunserver


class Command(BaseCommand):
    help = "Run migrations, seed demo data (idempotent), then start the development server."

    def add_arguments(self, parser):
        parser.add_argument('addrport', nargs='?', help='Optional addr:port')

    def handle(self, *args, **options):
        self.stdout.write('Applying migrations...')
        # Apply migrations (no user input)
        call_command('migrate', '--noinput')

        self.stdout.write('Seeding demo data (idempotent)...')
        try:
            call_command('create_demo_data')
        except Exception as e:
            # Warn but continue to start server — demo data may already exist or partial
            self.stdout.write(self.style.WARNING(f'create_demo_data failed or partially failed: {e}'))

        # Delegate to Django's original runserver command implementation
        runserver = OriginalRunserver()
        argv = ['manage.py', 'runserver']
        if options.get('addrport'):
            argv.append(options.get('addrport'))
        runserver.run_from_argv(argv)
