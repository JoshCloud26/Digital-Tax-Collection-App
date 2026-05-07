from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from accounts.models import User, TaxPayer
from payments.models import PITCalculation, PITDeduction, Transaction, AnnualReconciliation
from notifications.models import SMSNotification

class Command(BaseCommand):
    help = 'Create demo data for presentation'

    def handle(self, *args, **options):
        self.stdout.write('Creating demo data...')

        # Create admin user
        admin_user, created = User.objects.get_or_create(
            email='admin@gov.ng',
            defaults={
                'first_name': 'System',
                'last_name': 'Administrator',
                'user_type': 'admin',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write('Created admin user: admin@gov.ng / admin123')

        # Create tax officer
        officer_user, created = User.objects.get_or_create(
            email='officer@gov.ng',
            defaults={
                'first_name': 'John',
                'last_name': 'Officer',
                'user_type': 'tax_officer',
                'phone_number': '+2348012345678',
            }
        )
        if created:
            officer_user.set_password('officer123')
            officer_user.save()
            self.stdout.write('Created tax officer: officer@gov.ng / officer123')

        # Create sample taxpayers with different statuses
        taxpayers_data = [
            {
                'first_name': 'Ahmad', 'last_name': 'Muhammad', 'email': 'ahmad@email.com',
                'phone': '+2348023456789', 'sector': 'driver', 'location': 'Lafia',
                'state': 'nasarawa', 'deduction_day': 10,
                'income': 450000, 'status': 'active', 'verified': True
            },
            {
                'first_name': 'Fatima', 'last_name': 'Abubakar', 'email': 'fatima@email.com',
                'phone': '+2348034567890', 'sector': 'trader', 'location': 'Keffi',
                'state': 'nasarawa', 'deduction_day': 15,
                'income': 650000, 'status': 'active', 'verified': True
            },
            {
                'first_name': 'Ibrahim', 'last_name': 'Sani', 'email': 'ibrahim@email.com',
                'phone': '+2348045678901', 'sector': 'barber', 'location': 'Nasarawa Egon',
                'state': 'nasarawa', 'deduction_day': 5,
                'income': 280000, 'status': 'active', 'verified': True
            },
            {
                'first_name': 'Amina', 'last_name': 'Yusuf', 'email': 'amina@email.com',
                'phone': '+2348056789012', 'sector': 'hairdresser', 'location': 'Akar',
                'state': 'lagos', 'deduction_day': 12,
                'income': 350000, 'status': 'pending', 'verified': False
            },
            {
                'first_name': 'Mustapha', 'last_name': 'Aliyu', 'email': 'mustapha@email.com',
                'phone': '+2348067890123', 'sector': 'artisan', 'location': 'Kokona',
                'state': 'rivers', 'deduction_day': 20,
                'income': 420000, 'status': 'non_compliant', 'verified': True
            },
        ]

        for data in taxpayers_data:
            # Create user account
            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'phone_number': data['phone'],
                    'user_type': 'taxpayer',
                }
            )
            if created:
                user.set_password('demo123')
                user.save()

            # Create taxpayer profile
            taxpayer_defaults = {
                'taxpayer_id': f"TAX{user.id:04d}",
                'nin': f"1234567890{user.id}",
                'bvn': f"1234567890{user.id}",
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'phone_number': data['phone'],
                'sector': data['sector'],
                'location': data.get('location'),
                'state': data.get('state'),
                'home_address': f"{data.get('location', 'Unknown')} residential area",
                'business_address': f"{data.get('location', 'Unknown')} market/business address",
                'business_state': data.get('state'),
                'next_of_kin_phone': f'+234809{user.id:06d}',
                'next_of_kin_address': f"{data.get('location', 'Unknown')} (next of kin)",
                'deduction_day': data.get('deduction_day', 10),
                'monthly_income': data['income'],
                'bank_account_number': f"01{user.id}234567",
                'bank_name': 'First Bank Nigeria',
                'is_verified': data['verified'],
                'status': data['status'],
                'compliance_score': 85.0 if data['status'] == 'active' else 45.0,
            }

            taxpayer, created = TaxPayer.objects.get_or_create(
                email=data['email'],
                defaults=taxpayer_defaults
            )

            if created:
                self.stdout.write(f'Created taxpayer: {taxpayer.first_name} {taxpayer.last_name} ({data["status"]})')

                # Create PIT calculations and deductions for active taxpayers
                if data['status'] == 'active':
                    self._create_payment_history(taxpayer)

        # Create some failed payments for non-compliant user
        non_compliant = TaxPayer.objects.filter(status='non_compliant').first()
        if non_compliant:
            self._create_failed_payments(non_compliant)

        self.stdout.write('Demo data creation completed!')

    def _create_payment_history(self, taxpayer):
        """Create payment history for active taxpayers"""
        today = timezone.now().date()
        months = [today.replace(day=1) - timedelta(days=30*i) for i in range(6)]

        for month in months:
            # PIT calculation
            pit_due = taxpayer.monthly_income * Decimal('0.05')
            service_fee = pit_due * Decimal('0.01')
            calculation, calc_created = PITCalculation.objects.get_or_create(
                taxpayer=taxpayer,
                month=month,
                defaults={
                    'gross_income': taxpayer.monthly_income,
                    'pit_due': pit_due,
                    'service_fee': service_fee,
                }
            )

            # Ensure deduction exists (idempotent) and only create dependent records when new
            deduction_date = month.replace(day=10)
            deduction, ded_created = PITDeduction.objects.get_or_create(
                calculation=calculation,
                defaults={
                    'deduction_date': deduction_date,
                    'amount_deducted': pit_due,
                    'service_fee_deducted': service_fee,
                    'status': 'successful',
                    'transaction_reference': f"SUCCESS{calculation.id}",
                    'processed_at': timezone.now() - timedelta(days=25)
                }
            )

            if ded_created:
                # Create transactions (use get_or_create to avoid duplicates)
                Transaction.objects.get_or_create(
                    reference=f"PIT{calculation.id}",
                    defaults={
                        'taxpayer': taxpayer,
                        'transaction_type': 'pit_deduction',
                        'amount': pit_due,
                        'description': f"PIT deduction for {month.strftime('%B %Y')}",
                        'timestamp': deduction.processed_at,
                    }
                )

                Transaction.objects.get_or_create(
                    reference=f"FEE{calculation.id}",
                    defaults={
                        'taxpayer': taxpayer,
                        'transaction_type': 'service_fee',
                        'amount': service_fee,
                        'description': f"Service fee for {month.strftime('%B %Y')}",
                        'timestamp': deduction.processed_at,
                    }
                )

                # Create SMS notification
                SMSNotification.objects.create(
                    taxpayer=taxpayer,
                    notification_type='pit_deduction',
                    message=f"PIT of ₦{pit_due} and service fee of ₦{service_fee} deducted. Total: ₦{pit_due + service_fee}",
                    phone_number=taxpayer.phone_number,
                    sent_at=deduction.processed_at,
                    delivered=True
                )

    def _create_failed_payments(self, taxpayer):
        """Create failed payment history for non-compliant taxpayer"""
        today = timezone.now().date()
        months = [today.replace(day=1) - timedelta(days=30*i) for i in range(3)]

        for month in months:
            pit_due = taxpayer.monthly_income * Decimal('0.05')
            service_fee = pit_due * Decimal('0.01')
            calculation, calc_created = PITCalculation.objects.get_or_create(
                taxpayer=taxpayer,
                month=month,
                defaults={
                    'gross_income': taxpayer.monthly_income,
                    'pit_due': pit_due,
                    'service_fee': service_fee,
                }
            )

            # Failed deduction (idempotent)
            deduction_date = month.replace(day=10)
            deduction, ded_created = PITDeduction.objects.get_or_create(
                calculation=calculation,
                defaults={
                    'deduction_date': deduction_date,
                    'amount_deducted': pit_due,
                    'service_fee_deducted': service_fee,
                    'status': 'failed',
                    'transaction_reference': f"FAILED{calculation.id}",
                    'processed_at': timezone.now() - timedelta(days=25)
                }
            )

            if ded_created:
                taxpayer.consecutive_failed_payments += 1
                taxpayer.save()