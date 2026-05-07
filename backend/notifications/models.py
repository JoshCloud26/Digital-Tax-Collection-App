from django.db import models
from accounts.models import TaxPayer

class SMSNotification(models.Model):
    NOTIFICATION_TYPES = [
        ('registration_success', 'Registration Success'),
        ('pit_deduction', 'PIT Deduction'),
        ('payment_receipt', 'Payment Receipt'),
        ('verification_pending', 'Verification Pending'),
        ('verification_success', 'Verification Success'),
    ]

    taxpayer = models.ForeignKey(TaxPayer, on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    phone_number = models.CharField(max_length=15)
    sent_at = models.DateTimeField(blank=True, null=True)
    delivered = models.BooleanField(default=False)
    sms_reference = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"SMS to {self.phone_number} - {self.notification_type}"

    class Meta:
        ordering = ['-created_at']