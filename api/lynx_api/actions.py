import requests, os, json, logging
from .models import SMJob

def profile(data, auth_header):
    profiler_base_url = 'http://sm-mapper-' + os.environ['COLUMBUS_USERNAME'] + '/api/'
    response = requests.post(url=profiler_base_url + 'map', data=json.dumps(data), headers={'Authorization': auth_header, 'content-type': 'application/json'})
    uid = response.json()['uid']
    while(True):
        res = requests.get(url=profiler_base_url + 'status?uid=' + uid)
        status = res.json()['fnStatus']
        if status == 'complete':
            return True

def block(auth_header, **kwargs):
    blocker_url = 'http://blocker-' + os.environ['COLUMBUS_USERNAME'] + '/api/'
    data = {
        'aPath': kwargs['path'],
        'nA': kwargs['chunks'],
        'bPath': kwargs['path'],
        'nB': kwargs['chunks'],
        'containerUrl': kwargs['container_url'],
        'replicas': kwargs['replicas']
    }
    response = requests.post(url=blocker_url + 'block', data=json.dumps(data), headers={'Authorization': auth_header, 'content-type': 'application/json'})
    uid = response.json()['uid']
    while(True):
        res = requests.get(blocker_url + 'status?uid=' + uid)
        status = res.json()['fnStatus']
        if status == 'Complete':
            break
    data = {
        'uid': uid,
        'path': kwargs['output_folder'],
        'name': kwargs['output_name']
    }
    response = requests.post(url=blocker_url + 'save', data=json.dumps(data), headers={'Authorization': auth_header, 'content-type': 'application/json'})
    return True

def featurize():
    pass

def execute_workflow(auth_header, inputs):
    data = {
        'inputDir': inputs['inputDir'],
        'outputDir': inputs['outputDir'],
        'containerUrl': inputs['profilerUrl'],
        'replicas': inputs['profilerReplicas']
    }
    ret = profile(data, auth_header)
    if ret:
        ret = block(
            path = inputs['outputDir'] + '/output.csv',
            container_url = inputs['blockerUrl'],
            replicas = inputs['blockerReplicas'],
            chunks = inputs['blockerChunks'],
            output_folder = inputs['outputDir'],
            output_name = 'block.csv'
        )
        if ret:
            featurize()
