from rest_framework import serializers
from .models import PITCalculation, PITDeduction, Transaction, AnnualReconciliation, ComplianceIncentive

class PITCalculationSerializer(serializers.ModelSerializer):
    taxpayer_name = serializers.CharField(source='taxpayer.first_name', read_only=True)

    class Meta:
        model = PITCalculation
        fields = '__all__'

class PITDeductionSerializer(serializers.ModelSerializer):
    taxpayer_name = serializers.CharField(source='calculation.taxpayer.first_name', read_only=True)

    class Meta:
        model = PITDeduction
        fields = '__all__'

class TransactionSerializer(serializers.ModelSerializer):
    taxpayer_name = serializers.CharField(source='taxpayer.first_name', read_only=True)

    class Meta:
        model = Transaction
        fields = '__all__'

class AnnualReconciliationSerializer(serializers.ModelSerializer):
    taxpayer_name = serializers.CharField(source='taxpayer.first_name', read_only=True)
    taxpayer_id = serializers.CharField(source='taxpayer.taxpayer_id', read_only=True)

    class Meta:
        model = AnnualReconciliation
        fields = '__all__'

class ComplianceIncentiveSerializer(serializers.ModelSerializer):
    taxpayer_name = serializers.CharField(source='taxpayer.first_name', read_only=True)
    incentive_type_display = serializers.CharField(source='get_incentive_type_display', read_only=True)

    class Meta:
        model = ComplianceIncentive
        fields = '__all__'
