from django.db import models

# Create your models here.

class SMJob(models.Model):
    uid = models.CharField(max_length=20, primary_key=True)
    job_name = models.CharField(max_length=50)
    stage = models.CharField(max_length=20)
    iteration = models.IntegerField(default=-1)
    status = models.CharField(max_length=20)
    long_status = models.CharField(max_length=500)
    logs_available = models.BooleanField(default=False)
    labeling_url = models.URLField(max_length=500)
