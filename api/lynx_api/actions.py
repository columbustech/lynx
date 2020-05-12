from .job_manager import *
import os
from django.conf import settings
from .job_manager_factory import job_managers

def execute_workflow(uid, auth_header, data):
    os.mkdir(os.path.join(settings.DATA_PATH, uid))
    jm = SMJobManager(
        uid=uid,
        auth_header = auth_header,
        input_dir = data['inputDir'],
        output_dir = data['outputDir'],
        profiler_url = data['profilerUrl'],
        profiler_replicas = data['profilerReplicas'],
        blocker_url = data['blockerUrl'],
        blocker_replicas = data['blockerReplicas'],
        blocker_chunks = data['blockerChunks'],
        featurizer_url = data['featurizerUrl'],
        featurizer_replicas = data['featurizerReplicas'],
        featurizer_chunks = data['featurizerChunks'],
        seed_path = data['seedPath'],
        iterations = int(data['iterations']),
        current_iteration = -1,
        n_estimators = int(data['nEstimators']),
        batch_size = int(data['batchSize']),
        min_test_size = int(data['minTestSize'])
    )
    job_managers[uid] = jm
    jm.profile()
    jm.block()
    jm.featurize()
    jm.init_learner()
    jm.run_iteration()

def complete_iteration(uid):
    jm = job_managers[uid]
    return jm.complete_iteration()

def save_model(uid):
    jm = job_managers[uid]
    jm.save_model()
    jm.upload_model()

def apply_model(uid):
    jm = job_managers[uid]
    jm.apply_model()
