from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import JSONParser

from .models import SMJob
from .serializers import SMJobSerializer
from .job_manager import SMJobManager
from .actions import execute_workflow, complete_iteration, save_model, apply_model

import os, requests, string, random, threading, logging

class Specs(APIView):
    parser_class = (JSONParser,)

    def get(self, request):
        data = {
            'clientId': os.environ['COLUMBUS_CLIENT_ID'],
            'authUrl': os.environ['AUTHENTICATION_URL'],
            'cdriveUrl': os.environ['CDRIVE_URL'],
            'cdriveApiUrl': os.environ['CDRIVE_API_URL'],
            'username': os.environ['COLUMBUS_USERNAME']
        }
        return Response(data, status=status.HTTP_200_OK)

class AuthenticationToken(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request, format=None):
        code = request.data['code']
        redirect_uri = request.data['redirect_uri']
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri,
            'client_id': os.environ['COLUMBUS_CLIENT_ID'],
            'client_secret': os.environ['COLUMBUS_CLIENT_SECRET']
        }
        response = requests.post(url=os.environ['AUTHENTICATION_URL'] + 'o/token/', data=data)

        return Response(response.json(), status=response.status_code)

class ExecuteWorkflow(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request):
        auth_header = request.META['HTTP_AUTHORIZATION']
        token = auth_header.split()[1]

        uid = ''.join(random.choices(string.ascii_lowercase + string.digits,k=10))
        sm_job = SMJob(uid=uid, job_name=request.data['jobName'], stage="Profiling", status="Running", long_status="Initializing")
        sm_job.save()

        t = threading.Thread(target=execute_workflow, args=(uid, auth_header, request.data))
        t.start()

        return Response({'uid':uid}, status=status.HTTP_200_OK)

class WorkflowStatus(APIView):
    parser_class = (JSONParser,)

    def get(self, request):
        uid = request.query_params['uid']
        sm_job = SMJob.objects.filter(uid=uid)[0]
        return Response(SMJobSerializer(sm_job).data, status=status.HTTP_200_OK)

class CompleteIteration(APIView):
    parser_class = (JSONParser,)

    def post(self, request):
        uid = request.data['retId']
        return Response({'redirectUrl': complete_iteration(uid)}, status=status.HTTP_200_OK)

class ListJobs(APIView):
    parser_class = (JSONParser,)

    def get(self, request):
       return Response(SMJobSerializer(SMJob.objects.all(), many=True).data, status=status.HTTP_200_OK)

class SaveModel(APIView):
    parser_class = (JSONParser,)

    def post(self, request):
        uid = request.data['uid']
        save_model(uid)
        return Response(status=status.HTTP_200_OK)

class ApplyModel(APIView):
    parser_class = (JSONParser,)

    def post(self, request):
        uid = request.data['uid']
        apply_model(uid)
        return Response(status=status.HTTP_200_OK)

class DeleteJob(APIView):
    parser_class = (JSONParser,)

    def post(self, request):
        uid = request.data['uid']
        SMJob.objects.filter(uid=uid).delete()
        return Response(status=status.HTTP_200_OK)
