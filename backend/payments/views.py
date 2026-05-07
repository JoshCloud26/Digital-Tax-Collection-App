from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from django.db import models
from .models import PITCalculation, PITDeduction, Transaction, AnnualReconciliation, ComplianceIncentive
from .serializers import PITCalculationSerializer, PITDeductionSerializer, TransactionSerializer, AnnualReconciliationSerializer, ComplianceIncentiveSerializer
from accounts.models import TaxPayer
from django.db.models import Q

class PITCalculationViewSet(viewsets.ModelViewSet):
    queryset = PITCalculation.objects.all()
    serializer_class = PITCalculationSerializer

    @action(detail=False, methods=['post'])
    def calculate_monthly_pit(self, request):
        """Calculate PIT for all taxpayers for the current month"""
        current_month = date.today().replace(day=1)

        taxpayers = TaxPayer.objects.filter(is_verified=True)
        calculations = []

        for taxpayer in taxpayers:
            # Simple PIT calculation - in reality, this would be more complex
            # For informal sector, let's assume 5% of monthly income
            pit_rate = Decimal('0.05')
            pit_due = taxpayer.monthly_income * pit_rate
            service_fee = pit_due * Decimal('0.01')  # 1% service fee

            calculation, created = PITCalculation.objects.get_or_create(
                taxpayer=taxpayer,
                month=current_month,
                defaults={
                    'gross_income': taxpayer.monthly_income,
                    'pit_due': pit_due,
                    'service_fee': service_fee,
                }
            )

            if created:
                calculations.append(calculation)

        serializer = self.get_serializer(calculations, many=True)
        return Response({
            'message': f'Calculated PIT for {len(calculations)} taxpayers',
            'calculations': serializer.data
        })

class PITDeductionViewSet(viewsets.ModelViewSet):
    queryset = PITDeduction.objects.all()
    serializer_class = PITDeductionSerializer

    def list(self, request, *args, **kwargs):
        """List deductions with optional status/search and simple pagination"""
        queryset = self.get_queryset()
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search', '').strip()

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if search:
            queryset = queryset.filter(
                Q(calculation__taxpayer__first_name__icontains=search) |
                Q(calculation__taxpayer__last_name__icontains=search) |
                Q(calculation__taxpayer__taxpayer_id__icontains=search)
            )

        # pagination
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 25))
        except ValueError:
            page = 1
            page_size = 25

        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size

        serializer = self.get_serializer(queryset[start:end], many=True)
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': serializer.data,
        })

    @action(detail=False, methods=['post'])
    def process_monthly_deductions(self, request):
        """Process deductions for the previous month based on each taxpayer's selected deduction day.

        This endpoint can be called daily (e.g., via a scheduler) and will only process
        those taxpayers whose `deduction_day` matches today's day.
        """
        today = date.today()

        # Get calculations for the previous month
        previous_month = (today - relativedelta(months=1)).replace(day=1)
        calculations = PITCalculation.objects.filter(
            month=previous_month,
            pitdeduction__isnull=True  # Not yet deducted
        )

        deductions = []
        deductions = []
        for calculation in calculations:
            taxpayer = calculation.taxpayer
            # Use the taxpayer's selected deduction day (default 10)
            taxpayer_day = getattr(taxpayer, 'deduction_day', 10) or 10
            if taxpayer_day != today.day:
                # Not scheduled for today
                continue

            deduction_date = today
            total_deducted = calculation.pit_due + calculation.service_fee

            deduction = PITDeduction.objects.create(
                calculation=calculation,
                deduction_date=deduction_date,
                amount_deducted=calculation.pit_due,
                service_fee_deducted=calculation.service_fee,
                status='successful',  # Mock success
                transaction_reference=f"DED{calculation.id}{today.strftime('%Y%m%d')}"
            )

            # Create transactions
            Transaction.objects.create(
                taxpayer=calculation.taxpayer,
                transaction_type='pit_deduction',
                amount=calculation.pit_due,
                reference=f"PIT{calculation.id}",
                description=f"PIT deduction for {previous_month.strftime('%B %Y')}",
            )

            Transaction.objects.create(
                taxpayer=calculation.taxpayer,
                transaction_type='service_fee',
                amount=calculation.service_fee,
                reference=f"FEE{calculation.id}",
                description=f"Service fee for {previous_month.strftime('%B %Y')}",
            )

            # Send SMS notification
            from notifications.models import SMSNotification
            SMSNotification.objects.create(
                taxpayer=calculation.taxpayer,
                notification_type='pit_deduction',
                message=f"PIT of ₦{calculation.pit_due} and service fee of ₦{calculation.service_fee} deducted from your account. Total: ₦{total_deducted}",
                phone_number=calculation.taxpayer.phone_number
            )

            deductions.append(deduction)

        serializer = self.get_serializer(deductions, many=True)
        return Response({
            'message': f'Processed {len(deductions)} deductions',
            'deductions': serializer.data
        })

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer

    @action(detail=False, methods=['get'])
    def by_taxpayer(self, request):
        taxpayer_id = request.query_params.get('taxpayer_id')
        if not taxpayer_id:
            return Response({'error': 'taxpayer_id parameter required'})

        transactions = self.queryset.filter(taxpayer__taxpayer_id=taxpayer_id)
        serializer = self.get_serializer(transactions, many=True)
        return Response(serializer.data)

class AnnualReconciliationViewSet(viewsets.ModelViewSet):
    queryset = AnnualReconciliation.objects.all()
    serializer_class = AnnualReconciliationSerializer

    @action(detail=False, methods=['post'])
    def process_year_end_reconciliation(self, request):
        """Process annual reconciliation for all taxpayers"""
        year = request.data.get('year', date.today().year)

        taxpayers = TaxPayer.objects.filter(is_verified=True)
        reconciliations = []

        for taxpayer in taxpayers:
            # Calculate total PIT paid for the year
            total_pit = PITDeduction.objects.filter(
                calculation__taxpayer=taxpayer,
                calculation__month__year=year,
                status='successful'
            ).aggregate(total=models.Sum('amount_deducted'))['total'] or 0

            # Calculate total service fees
            total_fees = PITDeduction.objects.filter(
                calculation__taxpayer=taxpayer,
                calculation__month__year=year,
                status='successful'
            ).aggregate(total=models.Sum('service_fee_deducted'))['total'] or 0

            # Expected annual PIT (12 months * monthly PIT)
            expected_annual = taxpayer.monthly_income * Decimal('0.05') * 12

            # Calculate adjustment (if any)
            adjustment = expected_annual - total_pit

            reconciliation, created = AnnualReconciliation.objects.get_or_create(
                taxpayer=taxpayer,
                year=year,
                defaults={
                    'total_pit_paid': total_pit,
                    'total_service_fees': total_fees,
                    'expected_annual_pit': expected_annual,
                    'adjustment_amount': adjustment,
                    'status': 'completed',
                    'processed_at': datetime.now(),
                }
            )

            # Issue compliance certificate if fully compliant
            if total_pit >= expected_annual * Decimal('0.95'):  # 95% compliance threshold
                reconciliation.compliance_certificate_issued = True
                reconciliation.certificate_number = f"CERT{year}{taxpayer.taxpayer_id}"
                reconciliation.save()

                # Grant incentives
                self._grant_compliance_incentives(taxpayer, year)

            reconciliations.append(reconciliation)

        serializer = self.get_serializer(reconciliations, many=True)
        return Response({
            'message': f'Processed annual reconciliation for {len(reconciliations)} taxpayers',
            'reconciliations': serializer.data
        })

    def _grant_compliance_incentives(self, taxpayer, year):
        """Grant compliance incentives to eligible taxpayers"""
        incentives = [
            'loan_eligibility',
            'grant_access',
            'cooperative_benefits',
            'social_programs',
            'tax_certificate'
        ]

        for incentive_type in incentives:
            ComplianceIncentive.objects.get_or_create(
                taxpayer=taxpayer,
                incentive_type=incentive_type,
                year=year,
                defaults={
                    'is_eligible': True,
                    'granted_at': datetime.now(),
                    'description': f'Granted for tax year {year} compliance'
                }
            )

class ComplianceIncentiveViewSet(viewsets.ModelViewSet):
    queryset = ComplianceIncentive.objects.all()
    serializer_class = ComplianceIncentiveSerializer

    @action(detail=False, methods=['get'])
    def by_taxpayer(self, request):
        taxpayer_id = request.query_params.get('taxpayer_id')
        if not taxpayer_id:
            return Response({'error': 'taxpayer_id parameter required'})

        incentives = self.queryset.filter(taxpayer__taxpayer_id=taxpayer_id)
        serializer = self.get_serializer(incentives, many=True)
        return Response(serializer.data)
