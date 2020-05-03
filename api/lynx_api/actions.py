import requests, os, json, logging
from .models import SMJob

def profile(uid, auth_header, data):
    profiler_base_url = 'http://sm-mapper-' + os.environ['COLUMBUS_USERNAME'] + '/api/'
    response = requests.post(url=profiler_base_url + 'map', data=json.dumps(data), headers={'Authorization': auth_header, 'content-type': 'application/json'})
    profiler_id = response.json()['uid']
    sm_job = SMJob.objects.filter(uid=uid)[0]
    while(True):
        res = requests.get(url=profiler_base_url + 'status?uid=' + profiler_id)
        status = res.json()['fnStatus']
        if status == 'complete':
            return True
        elif status == 'running':
            if sm_job.long_status != res.json()['fnMessage'] :
                sm_job.long_status = res.json()['fnMessage']
                sm_job.save()
            
def block(uid, auth_header, **kwargs):
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
    blocker_id = response.json()['uid']
    sm_job = SMJob.objects.filter(uid=uid)[0]
    sm_job.stage = "Blocking"
    sm_job.status = "Running"
    sm_job.long_status = "Initializing"
    sm_job.save()
    while(True):
        res = requests.get(blocker_url + 'status?uid=' + blocker_id)
        status = res.json()['fnStatus']
        if status == 'Complete':
            break
        elif status == 'Running':
            if sm_job.long_status != res.json()['fnMessage'] :
                sm_job.long_status = res.json()['fnMessage']
                sm_job.save()

    data = {
        'uid': blocker_id,
        'path': kwargs['output_folder'],
        'name': kwargs['output_name']
    }
    response = requests.post(url=blocker_url + 'save', data=json.dumps(data), headers={'Authorization': auth_header, 'content-type': 'application/json'})
    return True

def featurize(uid, auth_header, **kwargs):
    featurizer_url = 'http://featurizer-' + os.environ['COLUMBUS_USERNAME'] + '/api/'
    data = {
        'aPath': kwargs['profile'],
        'bPath': kwargs['profile'],
        'cPath': kwargs['block'],
        'nC': kwargs['chunks'],
        'containerUrl': kwargs['container_url'],
        'replicas': kwargs['replicas']
    }
    response = requests.post(url=featurizer_url + 'generate', data=json.dumps(data), headers={'Authorization': auth_header, 'content-type': 'application/json'})
    featurizer_id = response.json()['uid']
    sm_job = SMJob.objects.filter(uid=uid)[0]
    sm_job.stage = "Featurizer"
    sm_job.status = "Running"
    sm_job.long_status = "Initializing"
    sm_job.save()
    attempts = 0
    while(True):
        res = requests.get(featurizer_url + 'status?uid=' + featurizer_id)
        if res.status_code != 200:
            attempts += 1
            if attempts > 10:
                return False
            continue
        attempts = 0
        status = res.json()['fnStatus']
        if status == 'Complete':
            break
        elif status == 'Running':
            if sm_job.long_status != res.json()['fnMessage'] :
                sm_job.long_status = res.json()['fnMessage']
                sm_job.save()

    data = {
        'uid': featurizer_id,
        'path': kwargs['output_folder'],
        'name': kwargs['output_name']
    }
    response = requests.post(url=featurizer_url + 'save', data=json.dumps(data), headers={'Authorization': auth_header, 'content-type': 'application/json'})
    return True

def learn():
    pass

def execute_workflow(uid, auth_header, inputs):
    data = {
        'inputDir': inputs['inputDir'],
        'outputDir': inputs['outputDir'],
        'containerUrl': inputs['profilerUrl'],
        'replicas': inputs['profilerReplicas']
    }
    ret = profile(uid, auth_header, data)
    if ret:
        ret = block(
            uid,
            auth_header,
            path = inputs['outputDir'] + '/output.csv',
            container_url = inputs['blockerUrl'],
            replicas = inputs['blockerReplicas'],
            chunks = inputs['blockerChunks'],
            output_folder = inputs['outputDir'],
            output_name = 'block.csv'
        )
    if ret:
        ret = featurize(
            uid,
            auth_header,
            profile = inputs['outputDir'] + '/output.csv',
            chunks = inputs['featurizerChunks'],
            block = inputs['outputDir'] + '/block.csv',
            container_url = inputs['featurizerUrl'],
            replicas = inputs['featurizerReplicas'],
            output_folder = inputs['outputDir'],
            output_name = 'features.csv'
        )
    if ret:
        ret = learn(
        )
