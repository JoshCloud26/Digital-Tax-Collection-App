from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, TaxPayer, LoanApplication, GrantApplication
from .lgas import get_lgas_for_state

class UserSerializer(serializers.ModelSerializer):
    user_type_display = serializers.CharField(source='get_user_type_display', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'user_type', 'user_type_display', 'phone_number', 'is_verified', 'date_joined']
        read_only_fields = ['id', 'is_verified', 'date_joined']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'phone_number', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(email=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            if not user.is_active:
                raise serializers.ValidationError('Account is disabled')
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Email and password are required')

class TaxPayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxPayer
        fields = '__all__'
        read_only_fields = ['taxpayer_id', 'is_verified', 'registration_date']

class TaxPayerRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxPayer
        fields = [
            'nin', 'bvn', 'first_name', 'last_name', 'phone_number',
            'email', 'sector', 'location', 'monthly_income',
            'bank_account_number', 'bank_name', 'state', 'deduction_day',
            'home_address', 'business_address', 'business_state', 'next_of_kin_phone', 'next_of_kin_address',
        ]

    def validate(self, attrs):
        business_state = attrs.get('business_state')
        location = attrs.get('location')

        if business_state and location:
            lgas = get_lgas_for_state(business_state)
            if lgas:
                valid_values = [l['value'] for l in lgas]
                # allow 'other' as a fallback value
                if location not in valid_values and location != 'other':
                    raise serializers.ValidationError({'location': 'Location is not valid for the selected business state.'})

        return attrs

    def create(self, validated_data):
        # Generate taxpayer ID
        import uuid
        taxpayer_id = f"TAX{uuid.uuid4().hex[:8].upper()}"
        validated_data['taxpayer_id'] = taxpayer_id
        return super().create(validated_data)

class LoanApplicationSerializer(serializers.ModelSerializer):
    taxpayer_name = serializers.CharField(source='taxpayer.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)

    class Meta:
        model = LoanApplication
        fields = '__all__'
        read_only_fields = ['applied_at', 'reviewed_at', 'disbursement_date']

class GrantApplicationSerializer(serializers.ModelSerializer):
    taxpayer_name = serializers.CharField(source='taxpayer.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)

    class Meta:
        model = GrantApplication
        fields = '__all__'
        read_only_fields = ['applied_at', 'reviewed_at', 'disbursement_date']
