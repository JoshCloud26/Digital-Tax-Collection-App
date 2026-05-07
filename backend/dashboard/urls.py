from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardViewSet, RevenueReportViewSet

router = DefaultRouter()
router.register(r'reports', RevenueReportViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardViewSet.as_view({'get': 'summary'}), name='dashboard-summary'),
    path('dashboard/sectors/', DashboardViewSet.as_view({'get': 'sector_breakdown'}), name='dashboard-sectors'),
    path('dashboard/locations/', DashboardViewSet.as_view({'get': 'location_breakdown'}), name='dashboard-locations'),
    path('dashboard/transactions/', DashboardViewSet.as_view({'get': 'recent_transactions'}), name='dashboard-transactions'),
    path('dashboard/user_journey_tracking/', DashboardViewSet.as_view({'get': 'user_journey_tracking'}), name='dashboard-user-journey'),
]
