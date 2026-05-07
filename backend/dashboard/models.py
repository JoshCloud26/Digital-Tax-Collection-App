from django.db import models

class RevenueReport(models.Model):
    REPORT_TYPES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annual', 'Annual'),
    ]

    report_type = models.CharField(max_length=10, choices=REPORT_TYPES)
    period_start = models.DateField()
    period_end = models.DateField()
    total_pit_collected = models.DecimalField(max_digits=15, decimal_places=2)
    total_service_fees = models.DecimalField(max_digits=15, decimal_places=2)
    total_taxpayers = models.IntegerField()
    compliance_rate = models.DecimalField(max_digits=5, decimal_places=2)  # Percentage
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.report_type} Report - {self.period_start} to {self.period_end}"

    class Meta:
        ordering = ['-generated_at']

class SectorAnalytics(models.Model):
    sector = models.CharField(max_length=20)
    total_taxpayers = models.IntegerField()
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2)
    average_income = models.DecimalField(max_digits=12, decimal_places=2)
    compliance_rate = models.DecimalField(max_digits=5, decimal_places=2)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.sector} Analytics"

class LocationAnalytics(models.Model):
    location = models.CharField(max_length=20)
    total_taxpayers = models.IntegerField()
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2)
    compliance_rate = models.DecimalField(max_digits=5, decimal_places=2)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.location} Analytics"