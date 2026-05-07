from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import UserSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login for both taxpayers and tax officers"""
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({
            'error': 'Email and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(email=email, password=password)

    if user is None:
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)

    if not user.is_active:
        return Response({
            'error': 'Account is disabled'
        }, status=status.HTTP_401_UNAUTHORIZED)

    # Generate tokens
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)

    return Response({
        'message': 'Login successful',
        'user': UserSerializer(user).data,
        'tokens': {
            'access': access_token,
            'refresh': str(refresh),
        }
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user_view(request):
    """Register a new user (taxpayer)"""
    from .serializers import UserRegistrationSerializer

    # Create user account first
    user_data = {
        'email': request.data.get('email'),
        'first_name': request.data.get('first_name'),
        'last_name': request.data.get('last_name'),
        'phone_number': request.data.get('phone_number'),
        'password': request.data.get('password'),
        'password_confirm': request.data.get('password_confirm'),
    }

    user_serializer = UserRegistrationSerializer(data=user_data)
    if user_serializer.is_valid():
        user = user_serializer.save()

        # Create taxpayer profile
        taxpayer_data = request.data.copy()
        taxpayer_data['user'] = user.id

        # Generate taxpayer ID
        import uuid
        taxpayer_id = f"TAX{uuid.uuid4().hex[:8].upper()}"
        taxpayer_data['taxpayer_id'] = taxpayer_id

        from .serializers import TaxPayerRegistrationSerializer
        taxpayer_serializer = TaxPayerRegistrationSerializer(data=taxpayer_data)
        if taxpayer_serializer.is_valid():
            taxpayer = taxpayer_serializer.save()

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
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        else:
            # If taxpayer creation fails, delete the user
            user.delete()
            return Response(taxpayer_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def logout_view(request):
    """Logout user by blacklisting refresh token"""
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logout successful'})
    except Exception as e:
        return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def user_profile_view(request):
    """Get current user profile"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)