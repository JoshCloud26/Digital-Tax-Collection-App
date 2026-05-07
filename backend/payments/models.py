from django.db import models
from accounts.models import TaxPayer

class PITCalculation(models.Model):
    taxpayer = models.ForeignKey(TaxPayer, on_delete=models.CASCADE)
    month = models.DateField()  # First day of the month
    gross_income = models.DecimalField(max_digits=12, decimal_places=2)
    pit_due = models.DecimalField(max_digits=12, decimal_places=2)
    service_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # 1% of pit_due
    calculated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"PIT for {self.taxpayer} - {self.month.strftime('%B %Y')}"

    class Meta:
        unique_together = ['taxpayer', 'month']

class PITDeduction(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('successful', 'Successful'),
        ('failed', 'Failed'),
    ]

    calculation = models.OneToOneField(PITCalculation, on_delete=models.CASCADE)
    deduction_date = models.DateField()  # 10th of the following month
    amount_deducted = models.DecimalField(max_digits=12, decimal_places=2)
    service_fee_deducted = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    transaction_reference = models.CharField(max_length=50, blank=True, null=True)
    processed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Deduction for {self.calculation} - {self.status}"

class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('pit_deduction', 'PIT Deduction'),
        ('service_fee', 'Service Fee'),
        ('refund', 'Refund'),
        ('annual_adjustment', 'Annual Adjustment'),
    ]

    taxpayer = models.ForeignKey(TaxPayer, on_delete=models.CASCADE)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=50, unique=True)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    bank_reference = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.transaction_type} - {self.amount} - {self.taxpayer}"

    class Meta:
        ordering = ['-timestamp']

class AnnualReconciliation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('adjusted', 'Adjusted'),
    ]

    taxpayer = models.ForeignKey(TaxPayer, on_delete=models.CASCADE)
    year = models.IntegerField()  # Tax year (e.g., 2026)
    total_pit_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_service_fees = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_annual_pit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    adjustment_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    compliance_certificate_issued = models.BooleanField(default=False)
    certificate_number = models.CharField(max_length=50, blank=True, null=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Reconciliation {self.year} - {self.taxpayer} - {self.status}"

    class Meta:
        unique_together = ['taxpayer', 'year']
        ordering = ['-year', 'taxpayer__last_name']

class ComplianceIncentive(models.Model):
    INCENTIVE_TYPES = [
        ('loan_eligibility', 'Government Loan Eligibility'),
        ('grant_access', 'Grant Program Access'),
        ('cooperative_benefits', 'Cooperative Benefits'),
        ('social_programs', 'Social Programs Access'),
        ('tax_certificate', 'Tax Compliance Certificate'),
    ]

    taxpayer = models.ForeignKey(TaxPayer, on_delete=models.CASCADE)
    incentive_type = models.CharField(max_length=30, choices=INCENTIVE_TYPES)
    year = models.IntegerField()
    is_eligible = models.BooleanField(default=False)
    granted_at = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.incentive_type} - {self.taxpayer} ({self.year})"

    class Meta:
        unique_together = ['taxpayer', 'incentive_type', 'year']
