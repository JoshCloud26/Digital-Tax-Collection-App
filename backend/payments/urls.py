from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PITCalculationViewSet, PITDeductionViewSet, TransactionViewSet, AnnualReconciliationViewSet, ComplianceIncentiveViewSet

router = DefaultRouter()
router.register(r'calculations', PITCalculationViewSet)
router.register(r'deductions', PITDeductionViewSet)
router.register(r'transactions', TransactionViewSet)
router.register(r'reconciliations', AnnualReconciliationViewSet)
router.register(r'incentives', ComplianceIncentiveViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
