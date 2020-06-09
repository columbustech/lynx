from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import JSONParser

from .models import SMJob
from .serializers import SMJobSerializer
from .job_manager import SMJobManager
from .actions import execute_workflow, complete_iteration, save_model, apply_model, calculate_accuracy

import py_cdrive_api

import os, requests, string, random, threading, logging, json

class Specs(APIView):
    parser_class = (JSONParser,)

    def get(self, request):
        data = {
            'clientId': os.environ['COLUMBUS_CLIENT_ID'],
            'authUrl': os.environ['AUTHENTICATION_URL'],
            'cdriveUrl': os.environ['CDRIVE_URL'],
            'cdriveApiUrl': os.environ['CDRIVE_API_URL'],
            'username': os.environ['COLUMBUS_USERNAME'],
            'appName': os.environ['APP_NAME'],
            'appUrl': os.environ['APP_URL']
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

class Config(APIView):
    parser_class = (JSONParser,)

    def get(self, request):
        auth_header = request.META['HTTP_AUTHORIZATION']
        token = auth_header.split()[1]
        client = None
        try:
            client = py_cdrive_api.Client(access_token=token)
            parent_details = client.list_detailed('users/' + os.environ['COLUMBUS_USERNAME'] + '/apps/lynx')
            if(parent_details['permission'] != 'Edit'):
                return Response(status=status.HTTP_403_FORBIDDEN)
        except py_cdrive_api.UnauthorizedAccessException as e:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        except py_cdrive_api.ForbiddenAccessException as e:
            return Response(status=status.HTTP_403_FORBIDDEN)

        config_url = None
        try:
            config_url = client.file_url('users/' + os.environ['COLUMBUS_USERNAME'] + '/apps/lynx/default_config.json')
        except py_cdrive_api.ForbiddenAccessException:
            return Response({}, status=status.HTTP_200_OK)
        response = requests.get(config_url)
        return Response(json.loads(response.text), status=status.HTTP_200_OK)

class SaveConfig(APIView):
    parser_class = (JSONParser,)

    def post(self, request):
        auth_header = request.META['HTTP_AUTHORIZATION']
        token = auth_header.split()[1]
        config_string = request.data['config']
        config_name = request.data['configName']
        client = None
        try:
            client = py_cdrive_api.Client(access_token=token)
            client.delete('users/' + os.environ['COLUMBUS_USERNAME'] + '/apps/lynx/' + config_name)
        except py_cdrive_api.UnauthorizedAccessException as e:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        except py_cdrive_api.ForbiddenAccessException as e:
            pass

        client.create_file(cdrive_path='users/' + os.environ['COLUMBUS_USERNAME'] + '/apps/lynx', content=config_string, file_name=config_name)
        return Response(status=status.HTTP_200_OK)

class ExecuteWorkflow(APIView):
    parser_class = (JSONParser,)

    @csrf_exempt
    def post(self, request):
        auth_header = request.META['HTTP_AUTHORIZATION']
        token = auth_header.split()[1]

        uid = ''.join(random.choices(string.ascii_lowercase + string.digits,k=10))
        #sm_job = SMJob(uid=uid, job_name=request.data['jobName'], stage="Profiling", status="Running", long_status="Initializing")
        sm_job = SMJob(uid=uid, job_name=uid, stage="Profiling", status="Running", long_status="Initializing")
        sm_job.save()

        t = threading.Thread(target=execute_workflow, args=(uid, token, request.data))
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
        path = request.data['path']
        save_model(uid, path)
        return Response(status=status.HTTP_200_OK)

class ApplyModel(APIView):
    parser_class = (JSONParser,)

    def post(self, request):
        uid = request.data['uid']
        path = request.data['path']
        apply_model(uid, path)
        return Response(status=status.HTTP_200_OK)

class DeleteJob(APIView):
    parser_class = (JSONParser,)

    def post(self, request):
        uid = request.data['uid']
        SMJob.objects.filter(uid=uid).delete()
        return Response(status=status.HTTP_200_OK)

class Accuracy(APIView):
    parser_class = (JSONParser,)

    def get(self, request):
        uid = request.query_params['uid']
        accuracy = calculate_accuracy(uid)
        return Response(accuracy, status=status.HTTP_200_OK)
