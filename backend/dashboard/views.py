from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, Q, F
from django.utils import timezone
from datetime import date, timedelta
from .models import RevenueReport, SectorAnalytics, LocationAnalytics
from .serializers import RevenueReportSerializer, SectorAnalyticsSerializer, LocationAnalyticsSerializer
from accounts.models import TaxPayer
from payments.models import PITDeduction, Transaction

class DashboardViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get overall dashboard summary"""
        state_filter = request.query_params.get('state', 'all')

        # Base taxpayer queryset (optionally filtered by state)
        taxpayers_qs = TaxPayer.objects.all()
        if state_filter and state_filter != 'all':
            taxpayers_qs = taxpayers_qs.filter(state=state_filter)

        total_taxpayers = taxpayers_qs.count()
        verified_taxpayers = taxpayers_qs.filter(is_verified=True).count()
        active_users = taxpayers_qs.filter(status='active').count()
        non_compliant_users = taxpayers_qs.filter(status='non_compliant').count()

        if state_filter and state_filter != 'all':
            total_revenue = PITDeduction.objects.filter(
                status='successful',
                calculation__taxpayer__state=state_filter
            ).aggregate(total=Sum('amount_deducted'))['total'] or 0
            total_service_fees = PITDeduction.objects.filter(
                status='successful',
                calculation__taxpayer__state=state_filter
            ).aggregate(total=Sum('service_fee_deducted'))['total'] or 0

            successful_payments = PITDeduction.objects.filter(
                status='successful',
                calculation__taxpayer__state=state_filter
            ).count()
            failed_payments = PITDeduction.objects.filter(
                status='failed',
                calculation__taxpayer__state=state_filter
            ).count()
        else:
            total_revenue = PITDeduction.objects.filter(status='successful').aggregate(total=Sum('amount_deducted'))['total'] or 0
            total_service_fees = PITDeduction.objects.filter(status='successful').aggregate(total=Sum('service_fee_deducted'))['total'] or 0

            successful_payments = PITDeduction.objects.filter(status='successful').count()
            failed_payments = PITDeduction.objects.filter(status='failed').count()

        # Overall compliance rate (successful deductions / total deductions)
        total_deductions = PITDeduction.objects.count()
        compliance_rate = (successful_payments / total_deductions * 100) if total_deductions > 0 else 0

        # Top performing LGA (by revenue)
        top_lga_qs = taxpayers_qs.values('location').annotate(
            total_revenue=Sum('pitcalculation__pitdeduction__amount_deducted')
        ).filter(total_revenue__isnull=False).order_by('-total_revenue')
        top_lga = top_lga_qs.first()

        # Low compliance alert (LGAs with compliance rate < 50%)
        low_compliance_lgas = taxpayers_qs.values('location').annotate(
            total_deductions=Count('pitcalculation__pitdeduction'),
            successful_deductions=Count('pitcalculation__pitdeduction', filter=Q(pitcalculation__pitdeduction__status='successful'))
        ).filter(total_deductions__gt=0).annotate(
            compliance_rate=F('successful_deductions') / F('total_deductions') * 100
        ).filter(compliance_rate__lt=50).order_by('compliance_rate')[:3]

        return Response({
            'total_taxpayers': total_taxpayers,
            'verified_taxpayers': verified_taxpayers,
            'active_users': active_users,
            'non_compliant_users': non_compliant_users,
            'successful_payments': successful_payments,
            'failed_payments': failed_payments,
            'total_revenue': total_revenue,
            'total_service_fees': total_service_fees,
            'compliance_rate': round(compliance_rate, 2),
            'top_performing_lga': top_lga['location'] if top_lga else None,
            'low_compliance_alerts': list(low_compliance_lgas.values('location', 'compliance_rate')),
        })

    @action(detail=False, methods=['get'])
    def sector_breakdown(self, request):
        """Revenue breakdown by sector"""
        state_filter = request.query_params.get('state', 'all')
        qs = TaxPayer.objects.all()
        if state_filter and state_filter != 'all':
            qs = qs.filter(state=state_filter)

        sectors = qs.values('sector').annotate(
            total_taxpayers=Count('id'),
            total_revenue=Sum('pitcalculation__pitdeduction__amount_deducted'),
            average_income=Avg('monthly_income')
        ).filter(total_revenue__isnull=False)

        return Response(list(sectors))

    @action(detail=False, methods=['get'])
    def location_breakdown(self, request):
        """Revenue breakdown by location"""
        state_filter = request.query_params.get('state', 'all')
        qs = TaxPayer.objects.all()
        if state_filter and state_filter != 'all':
            qs = qs.filter(state=state_filter)

        locations = qs.values('location').annotate(
            total_taxpayers=Count('id'),
            total_revenue=Sum('pitcalculation__pitdeduction__amount_deducted')
        ).filter(total_revenue__isnull=False)

        return Response(list(locations))

    @action(detail=False, methods=['get'])
    def recent_transactions(self, request):
        """Get recent transactions"""
        from payments.serializers import TransactionSerializer
        state_filter = request.query_params.get('state', 'all')
        if state_filter and state_filter != 'all':
            transactions = Transaction.objects.filter(taxpayer__state=state_filter)[:10]
        else:
            transactions = Transaction.objects.all()[:10]
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def user_journey_tracking(self, request):
        """Track user journey: registered, verified, paying status"""
        # Count users in each stage
        state_filter = request.query_params.get('state', 'all')
        qs = TaxPayer.objects.all()
        if state_filter and state_filter != 'all':
            qs = qs.filter(state=state_filter)

        registered_users = qs.count()
        verified_users = qs.filter(is_verified=True).count()
        paying_users = qs.filter(
            pitcalculation__pitdeduction__status='successful'
        ).distinct().count()

        # Get recent registrations (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_registrations = TaxPayer.objects.filter(
            registration_date__gte=thirty_days_ago
        ).count()

        # Get recent verifications (last 30 days)
        recent_verifications = TaxPayer.objects.filter(
            is_verified=True,
            registration_date__gte=thirty_days_ago
        ).count()

        # Get recent successful payments (last 30 days)
        recent_payments_qs = PITDeduction.objects.filter(
            status='successful',
            processed_at__gte=thirty_days_ago
        )
        if state_filter and state_filter != 'all':
            recent_payments_qs = recent_payments_qs.filter(calculation__taxpayer__state=state_filter)

        recent_payments = recent_payments_qs.values('calculation__taxpayer').distinct().count()

        return Response({
            'total_registered': registered_users,
            'total_verified': verified_users,
            'total_paying': paying_users,
            'recent_registrations': recent_registrations,
            'recent_verifications': recent_verifications,
            'recent_payments': recent_payments,
            'conversion_rates': {
                'verification_rate': (verified_users / registered_users * 100) if registered_users > 0 else 0,
                'payment_rate': (paying_users / verified_users * 100) if verified_users > 0 else 0,
            }
        })

class RevenueReportViewSet(viewsets.ModelViewSet):
    queryset = RevenueReport.objects.all()
    serializer_class = RevenueReportSerializer

    @action(detail=False, methods=['post'])
    def generate_monthly_report(self, request):
        """Generate monthly revenue report"""
        today = date.today()
        month_start = today.replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        # Calculate metrics
        state_filter = request.data.get('state') or request.query_params.get('state', 'all')

        total_pit_qs = PITDeduction.objects.filter(
            deduction_date__range=[month_start, month_end],
            status='successful'
        )
        if state_filter and state_filter != 'all':
            total_pit_qs = total_pit_qs.filter(calculation__taxpayer__state=state_filter)

        total_pit = total_pit_qs.aggregate(total=Sum('amount_deducted'))['total'] or 0

        total_fees_qs = PITDeduction.objects.filter(
            deduction_date__range=[month_start, month_end],
            status='successful'
        )
        if state_filter and state_filter != 'all':
            total_fees_qs = total_fees_qs.filter(calculation__taxpayer__state=state_filter)

        total_fees = total_fees_qs.aggregate(total=Sum('service_fee_deducted'))['total'] or 0

        total_taxpayers = TaxPayer.objects.count() if state_filter == 'all' else TaxPayer.objects.filter(state=state_filter).count()
        successful_deductions = PITDeduction.objects.filter(
            deduction_date__range=[month_start, month_end],
            status='successful'
        )
        if state_filter and state_filter != 'all':
            successful_deductions = successful_deductions.filter(calculation__taxpayer__state=state_filter)
        successful_deductions = successful_deductions.count()

        compliance_rate = (successful_deductions / total_taxpayers * 100) if total_taxpayers > 0 else 0

        report = RevenueReport.objects.create(
            report_type='monthly',
            period_start=month_start,
            period_end=month_end,
            total_pit_collected=total_pit,
            total_service_fees=total_fees,
            total_taxpayers=total_taxpayers,
            compliance_rate=compliance_rate,
        )

        serializer = self.get_serializer(report)
        return Response(serializer.data)