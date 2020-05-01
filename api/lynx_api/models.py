from django.db import models

# Create your models here.

class SMJob(models.Model):
    uid = models.CharField(max_length=20, primary_key=True)
    stage = models.CharField(max_length=20)
    status = models.CharField(max_length=20)
    long_status = models.CharField(max_length=500)
    logs_available = models.BooleanField(default=False)
