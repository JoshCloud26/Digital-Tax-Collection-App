from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from accounts.models import TaxPayer
from payments.models import PITDeduction

class Command(BaseCommand):
    help = 'Process SOP rules for taxpayer status management'

    def handle(self, *args, **options):
        self.stdout.write('Processing SOP rules...')

        # Rule 1: If user registers → must be verified before activation
        unverified_taxpayers = TaxPayer.objects.filter(is_verified=False, status='pending')
        for taxpayer in unverified_taxpayers:
            # Check if registered more than 7 days ago and still unverified
            if taxpayer.registration_date < timezone.now() - timedelta(days=7):
                taxpayer.status = 'failed'
                taxpayer.save()
                self.stdout.write(f'Set {taxpayer} to failed status (unverified after 7 days)')

        # Rule 2: If payment fails → retry after 3 days
        failed_deductions = PITDeduction.objects.filter(
            status='failed',
            deduction_date__lt=timezone.now().date() - timedelta(days=3)
        )

        for deduction in failed_deductions:
            # Create retry deduction (in real implementation, this would trigger payment retry)
            taxpayer = deduction.calculation.taxpayer
            taxpayer.consecutive_failed_payments += 1
            taxpayer.save()

            self.stdout.write(f'Payment retry needed for {taxpayer} (failed {taxpayer.consecutive_failed_payments} times)')

        # Rule 3: If user misses 2 payments → flag as non-compliant
        taxpayers_with_multiple_failures = TaxPayer.objects.filter(consecutive_failed_payments__gte=2)
        for taxpayer in taxpayers_with_multiple_failures:
            if taxpayer.status != 'non_compliant':
                taxpayer.status = 'non_compliant'
                taxpayer.save()
                self.stdout.write(f'Flagged {taxpayer} as non-compliant (2+ failed payments)')

        # Update compliance scores
        all_taxpayers = TaxPayer.objects.all()
        for taxpayer in all_taxpayers:
            # Calculate compliance score based on successful payments vs total expected
            total_deductions = PITDeduction.objects.filter(calculation__taxpayer=taxpayer).count()
            successful_deductions = PITDeduction.objects.filter(
                calculation__taxpayer=taxpayer,
                status='successful'
            ).count()

            if total_deductions > 0:
                compliance_score = (successful_deductions / total_deductions) * 100
            else:
                compliance_score = 0

            taxpayer.compliance_score = compliance_score
            taxpayer.save()

        # Update status based on verification and compliance
        verified_taxpayers = TaxPayer.objects.filter(is_verified=True)
        for taxpayer in verified_taxpayers:
            if taxpayer.status == 'pending':
                taxpayer.status = 'active'
                taxpayer.save()
                self.stdout.write(f'Activated {taxpayer} (verified and compliant)')

        self.stdout.write('SOP rules processing completed.')