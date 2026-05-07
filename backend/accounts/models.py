from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import BaseUserManager
from django.core.validators import MinValueValidator, MaxValueValidator

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    USER_TYPE_CHOICES = [
        ('taxpayer', 'Taxpayer'),
        ('tax_officer', 'Tax Officer'),
        ('admin', 'Administrator'),
    ]

    username = None
    email = models.EmailField(unique=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='taxpayer')
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    is_verified = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.get_user_type_display()})"

class TaxPayer(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('pending', 'Pending'),
        ('failed', 'Failed'),
        ('non_compliant', 'Non-compliant'),
    ]

    SECTOR_CHOICES = [
        ('barber', 'Barber'),
        ('hairdresser', 'Hairdresser'),
        ('driver', 'Uber Driver'),
        ('artisan', 'Artisan'),
        ('trader', 'Trader'),
        ('other', 'Other'),
    ]

    # Nigeria states (slug, display)
    NIGERIA_STATES = [
        ('abia', 'Abia'), ('adamawa', 'Adamawa'), ('akwa_ibom', 'Akwa Ibom'),
        ('anambra', 'Anambra'), ('bauchi', 'Bauchi'), ('bayelsa', 'Bayelsa'),
        ('benue', 'Benue'), ('borno', 'Borno'), ('cross_river', 'Cross River'),
        ('delta', 'Delta'), ('ebonyi', 'Ebonyi'), ('edo', 'Edo'), ('ekiti', 'Ekiti'),
        ('enugu', 'Enugu'), ('gombe', 'Gombe'), ('imo', 'Imo'), ('jigawa', 'Jigawa'),
        ('kaduna', 'Kaduna'), ('kano', 'Kano'), ('katsina', 'Katsina'), ('kebbi', 'Kebbi'),
        ('kogi', 'Kogi'), ('kwara', 'Kwara'), ('lagos', 'Lagos'), ('nasarawa', 'Nasarawa'),
        ('niger', 'Niger'), ('ogun', 'Ogun'), ('ondo', 'Ondo'), ('osun', 'Osun'),
        ('oyo', 'Oyo'), ('plateau', 'Plateau'), ('rivers', 'Rivers'), ('sokoto', 'Sokoto'),
        ('taraba', 'Taraba'), ('yobe', 'Yobe'), ('zamfara', 'Zamfara'), ('fct', 'FCT - Abuja'),
    ]

    taxpayer_id = models.CharField(max_length=20, unique=True)
    nin = models.CharField(max_length=11, unique=True)  # NIN is 11 digits
    bvn = models.CharField(max_length=11, unique=True)  # BVN is 11 digits
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15)
    email = models.EmailField(blank=True, null=True)
    sector = models.CharField(max_length=20, choices=SECTOR_CHOICES)
    # Generic location field (LGA / town)
    location = models.CharField(max_length=100, blank=True, null=True)
    # State selection (slug)
    state = models.CharField(max_length=30, choices=NIGERIA_STATES, blank=True, null=True)
    # Home/residential address
    home_address = models.TextField(blank=True, null=True)
    # Business address and its state (can differ from personal state)
    business_address = models.TextField(blank=True, null=True)
    business_state = models.CharField(max_length=30, choices=NIGERIA_STATES, blank=True, null=True)
    # Next of kin contact details
    next_of_kin_phone = models.CharField(max_length=15, blank=True, null=True)
    next_of_kin_address = models.TextField(blank=True, null=True)
    monthly_income = models.DecimalField(max_digits=12, decimal_places=2)
    bank_account_number = models.CharField(max_length=10)
    bank_name = models.CharField(max_length=100)
    # Day of month to attempt deduction (1-28). Default kept as 10 for backward compatibility.
    deduction_day = models.IntegerField(default=10, validators=[MinValueValidator(1), MaxValueValidator(28)])
    is_verified = models.BooleanField(default=False)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    registration_date = models.DateTimeField(auto_now_add=True)
    last_payment_date = models.DateField(blank=True, null=True)
    consecutive_failed_payments = models.IntegerField(default=0)
    compliance_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.taxpayer_id}"

    class Meta:
        ordering = ['-registration_date']

class LoanApplication(models.Model):
    LOAN_TYPES = [
        ('micro_business', 'Micro Business Loan'),
        ('agricultural', 'Agricultural Loan'),
        ('education', 'Education Loan'),
        ('housing', 'Housing Loan'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('disbursed', 'Disbursed'),
    ]

    taxpayer = models.ForeignKey(TaxPayer, on_delete=models.CASCADE)
    loan_type = models.CharField(max_length=20, choices=LOAN_TYPES)
    amount_requested = models.DecimalField(max_digits=12, decimal_places=2)
    purpose = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)
    disbursement_date = models.DateField(blank=True, null=True)
    monthly_repayment = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.loan_type} - {self.taxpayer} - ₦{self.amount_requested}"

class GrantApplication(models.Model):
    GRANT_TYPES = [
        ('youth_empowerment', 'Youth Empowerment Grant'),
        ('women_enterprise', 'Women Enterprise Grant'),
        ('agricultural_development', 'Agricultural Development Grant'),
        ('skill_acquisition', 'Skill Acquisition Grant'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('disbursed', 'Disbursed'),
    ]

    taxpayer = models.ForeignKey(TaxPayer, on_delete=models.CASCADE)
    grant_type = models.CharField(max_length=25, choices=GRANT_TYPES)
    amount_requested = models.DecimalField(max_digits=12, decimal_places=2)
    business_plan = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)
    disbursement_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.grant_type} - {self.taxpayer} - ₦{self.amount_requested}"


class LGA(models.Model):
    """Local Government Area lookup table for states.

    Fields:
    - state_code: slug for the state (matches TaxPayer.NIGERIA_STATES values)
    - value: machine-friendly LGA value (slug)
    - label: human-friendly display name
    """
    state_code = models.CharField(max_length=30)
    value = models.CharField(max_length=100)
    label = models.CharField(max_length=200)

    class Meta:
        unique_together = (('state_code', 'value'),)
        indexes = [models.Index(fields=['state_code'])]
        ordering = ['state_code', 'label']

    def __str__(self):
        return f"{self.label} ({self.state_code})"
