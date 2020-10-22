from .job_manager import *
import os
from django.conf import settings
from .job_manager_factory import job_managers

def execute_workflow(uid, token, data):
    os.mkdir(os.path.join(settings.DATA_PATH, uid))
    gold_path = None
    if 'goldPath' in data:
        gold_path = data['goldPath']
    #blocker_fields = next(filter(lambda x: x['stage'] == 'blocking', data['parameters']))
    #blocker_chunks = next(filter(lambda x: x['name'] == 'chunks', blocker_fields['parameters']))['value']
    #featurizer_fields = next(filter(lambda x: x['stage'] == 'featurizing', data['parameters']))
    #featurizer_chunks = next(filter(lambda x: x['name'] == 'chunks', blocker_fields['parameters']))['value']
    jm = SMJobManager(
        uid=uid,
        auth_header = 'Bearer ' + token,
        input_dir = data['inputPath'],
        output_dir = data['outputPath'],
        profiler_url = data['profilerUrl'],
        profiler_replicas = data['profilerReplicas'],
        blocker_url = data['blockerUrl'],
        blocker_replicas = data['blockerReplicas'],
        #blocker_chunks = blocker_chunks,
        featurizer_url = data['featurizerUrl'],
        featurizer_replicas = data['featurizerReplicas'],
        #featurizer_chunks = featurizer_chunks,
        iterations = int(data['iterations']),
        current_iteration = 0,
        n_estimators = int(data['nEstimators']),
        batch_size = int(data['batchSize']),
        min_test_size = int(data['minTestSize']),
        gold_path = gold_path
    )
    job_managers[uid] = jm
    if not jm.profile():
        del job_managers[uid]
        return
    if not jm.block():
        return
        del job_managers[uid]
    jm.create_seed_examples()
    if not jm.featurize():
        return
        del job_managers[uid]
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

def calculate_accuracy(uid):
    jm = job_managers[uid]
    return jm.calculate_accuracy()
