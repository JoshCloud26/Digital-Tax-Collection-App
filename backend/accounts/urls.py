from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import TaxPayerViewSet, LoanApplicationViewSet, GrantApplicationViewSet, lgas_list
from .auth_views import login_view, register_user_view, logout_view, user_profile_view

router = DefaultRouter()
router.register(r'taxpayers', TaxPayerViewSet)
router.register(r'loans', LoanApplicationViewSet)
router.register(r'grants', GrantApplicationViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # Authentication endpoints
    path('auth/login/', login_view, name='login'),
    path('auth/register/', register_user_view, name='register'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/profile/', user_profile_view, name='profile'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Dashboard endpoints
    path('dashboard/', TaxPayerViewSet.as_view({'get': 'dashboard_list'}), name='taxpayer-dashboard-list'),
    # Locations
    path('locations/lgas/', lgas_list, name='lgas-list'),
]
