from .job_manager import *
import os
from django.conf import settings
from .job_manager_factory import job_managers
import py_cdrive_api

def execute_workflow(uid, token, data):
    os.mkdir(os.path.join(settings.DATA_PATH, uid))
    client = py_cdrive_api.CDriveClient(access_token=token)
    parent = client.list('users/' + os.environ['COLUMBUS_USERNAME'] + '/apps/lynx')
    data_query_it = filter(lambda x: x['name'] == 'data', parent['driveObjects'])
    try:
        data_folder = next(data_query_it)
    except StopIteration:
        client.create('users/' + os.environ['COLUMBUS_USERNAME'] + '/apps/lynx', 'data')
    client.create('users/' + os.environ['COLUMBUS_USERNAME'] + '/apps/lynx/data', uid)

    jm = SMJobManager(
        uid=uid,
        auth_header = 'Bearer ' + token,
        input_dir = data['lakePath'],
        output_dir = 'users/' + os.environ['COLUMBUS_USERNAME'] + '/apps/lynx/data/' + uid,
        profiler_url = data['profilerUrl'],
        profiler_replicas = data['profilerReplicas'],
        blocker_url = data['blockerUrl'],
        blocker_replicas = data['blockerReplicas'],
        blocker_chunks = data['blockerChunks'],
        featurizer_url = data['featurizerUrl'],
        featurizer_replicas = data['featurizerReplicas'],
        featurizer_chunks = data['featurizerChunks'],
        iterations = int(data['iterations']),
        current_iteration = 0,
        n_estimators = int(data['nEstimators']),
        batch_size = int(data['batchSize']),
        min_test_size = int(data['minTestSize'])
    )
    job_managers[uid] = jm
    jm.profile()
    jm.block()
    jm.create_seed_examples()
    jm.featurize()
    jm.init_learner()

def complete_iteration(uid):
    jm = job_managers[uid]
    return jm.complete_iteration()

def save_model(uid, path):
    jm = job_managers[uid]
    jm.save_model(path)

def apply_model(uid, path):
    jm = job_managers[uid]
    jm.apply_model(path)
