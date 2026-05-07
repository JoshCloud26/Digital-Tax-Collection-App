from rest_framework import viewsets, status
from rest_framework.decorators import action, permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from .models import TaxPayer, LoanApplication, GrantApplication, LGA
from .serializers import TaxPayerSerializer, TaxPayerRegistrationSerializer, LoanApplicationSerializer, GrantApplicationSerializer
from .lgas import get_lgas_for_state

class TaxPayerViewSet(viewsets.ModelViewSet):
    queryset = TaxPayer.objects.all()
    serializer_class = TaxPayerSerializer

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = TaxPayerRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            # Here we would verify NIN and BVN with external APIs
            # For now, we'll assume verification passes
            taxpayer = serializer.save()

            # Send SMS notification
            from notifications.models import SMSNotification
            SMSNotification.objects.create(
                taxpayer=taxpayer,
                notification_type='registration_success',
                message=f"Welcome {taxpayer.first_name}! Your taxpayer ID is {taxpayer.taxpayer_id}. Registration successful.",
                phone_number=taxpayer.phone_number
            )

            return Response({
                'message': 'Registration successful',
                'taxpayer_id': taxpayer.taxpayer_id,
                'data': TaxPayerSerializer(taxpayer).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        taxpayer = self.get_object()
        # Mock verification - in real implementation, call NIMC and CBN APIs
        taxpayer.is_verified = True
        taxpayer.save()

        # Send verification SMS
        from notifications.models import SMSNotification
        SMSNotification.objects.create(
            taxpayer=taxpayer,
            notification_type='verification_success',
            message=f"Your account has been verified. You can now receive PIT deductions.",
            phone_number=taxpayer.phone_number
        )

        return Response({'message': 'Taxpayer verified successfully'})

    @action(detail=False, methods=['get'])
    def dashboard_list(self, request):
        """Get taxpayers list for dashboard with filtering"""
        status_filter = request.query_params.get('status', 'all')
        sector_filter = request.query_params.get('sector', 'all')
        location_filter = request.query_params.get('location', 'all')
        state_filter = request.query_params.get('state', 'all')
        search = request.query_params.get('search', '').strip()

        # Pagination params
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 25))
        except ValueError:
            page = 1
            page_size = 25

        queryset = self.get_queryset()

        if status_filter != 'all':
            queryset = queryset.filter(status=status_filter)
        if sector_filter != 'all':
            queryset = queryset.filter(sector=sector_filter)
        if location_filter != 'all':
            queryset = queryset.filter(location=location_filter)
        if state_filter != 'all':
            queryset = queryset.filter(state=state_filter)

        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(taxpayer_id__icontains=search)
            )

        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size

        taxpayers_data = []
        for taxpayer in queryset[start:end]:
            last_payment = taxpayer.pitcalculation_set.filter(
                pitdeduction__status='successful'
            ).order_by('-month').first()

            taxpayer_info = {
                'id': taxpayer.id,
                'taxpayer_id': taxpayer.taxpayer_id,
                'first_name': taxpayer.first_name,
                'last_name': taxpayer.last_name,
                'email': taxpayer.email,
                'phone_number': taxpayer.phone_number,
                'sector': taxpayer.sector,
                'location': taxpayer.location,
                'state': taxpayer.state,
                'monthly_income': taxpayer.monthly_income,
                'status': taxpayer.status,
                'compliance_score': taxpayer.compliance_score,
                'is_verified': taxpayer.is_verified,
                'registration_date': taxpayer.registration_date,
                'last_payment_date': last_payment.month if last_payment else None,
            }
            taxpayers_data.append(taxpayer_info)

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': taxpayers_data,
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def lgas_list(request):
    """Return LGAs for a provided state code.

    Query param: `state` (e.g. `nasarawa`, `lagos`, `fct`)
    """
    state = request.query_params.get('state')
    if not state:
        return Response({'detail': 'state query param is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Prefer DB-backed LGAs (if seeded). Fallback to in-file STATE_LGAS mapping.
    try:
        qs = LGA.objects.filter(state_code=state).order_by('label').values('value', 'label')
        lgas = list(qs)
    except Exception:
        lgas = []

    if not lgas:
        lgas = get_lgas_for_state(state)

    return Response(lgas)

class LoanApplicationViewSet(viewsets.ModelViewSet):
    queryset = LoanApplication.objects.all()
    serializer_class = LoanApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter applications based on user role"""
        user = self.request.user
        if user.user_type == 'tax_officer' or user.user_type == 'admin':
            return LoanApplication.objects.all()
        elif user.user_type == 'taxpayer':
            # Taxpayers can only see their own applications
            return LoanApplication.objects.filter(taxpayer__email=user.email)
        return LoanApplication.objects.none()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a loan application"""
        if request.user.user_type not in ['tax_officer', 'admin']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        application = self.get_object()
        application.status = 'approved'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save()

        return Response({'message': 'Loan application approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a loan application"""
        if request.user.user_type not in ['tax_officer', 'admin']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        application = self.get_object()
        application.status = 'rejected'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.notes = request.data.get('notes', '')
        application.save()

        return Response({'message': 'Loan application rejected'})

    @action(detail=True, methods=['post'])
    def disburse(self, request, pk=None):
        """Mark loan as disbursed"""
        if request.user.user_type not in ['tax_officer', 'admin']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        application = self.get_object()
        if application.status != 'approved':
            return Response({'error': 'Can only disburse approved applications'}, status=status.HTTP_400_BAD_REQUEST)

        application.status = 'disbursed'
        application.disbursement_date = timezone.now().date()
        application.save()

        return Response({'message': 'Loan disbursed successfully'})

class GrantApplicationViewSet(viewsets.ModelViewSet):
    queryset = GrantApplication.objects.all()
    serializer_class = GrantApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter applications based on user role"""
        user = self.request.user
        if user.user_type == 'tax_officer' or user.user_type == 'admin':
            return GrantApplication.objects.all()
        elif user.user_type == 'taxpayer':
            # Taxpayers can only see their own applications
            return GrantApplication.objects.filter(taxpayer__email=user.email)
        return GrantApplication.objects.none()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a grant application"""
        if request.user.user_type not in ['tax_officer', 'admin']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        application = self.get_object()
        application.status = 'approved'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save()

        return Response({'message': 'Grant application approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a grant application"""
        if request.user.user_type not in ['tax_officer', 'admin']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        application = self.get_object()
        application.status = 'rejected'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.notes = request.data.get('notes', '')
        application.save()

        return Response({'message': 'Grant application rejected'})

    @action(detail=True, methods=['post'])
    def disburse(self, request, pk=None):
        """Mark grant as disbursed"""
        if request.user.user_type not in ['tax_officer', 'admin']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        application = self.get_object()
        if application.status != 'approved':
            return Response({'error': 'Can only disburse approved applications'}, status=status.HTTP_400_BAD_REQUEST)

        application.status = 'disbursed'
        application.disbursement_date = timezone.now().date()
        application.save()

        return Response({'message': 'Grant disbursed successfully'})
