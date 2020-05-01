from rest_framework import serializers
from .models import SMJob

class SMJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMJob
        fields = '__all__'
