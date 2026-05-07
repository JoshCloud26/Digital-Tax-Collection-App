from rest_framework import serializers
from .models import RevenueReport, SectorAnalytics, LocationAnalytics

class RevenueReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevenueReport
        fields = '__all__'

class SectorAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SectorAnalytics
        fields = '__all__'

class LocationAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationAnalytics
        fields = '__all__'