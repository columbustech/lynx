import requests, os, json, logging
from django.conf import settings
from .models import SMJob
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib

def calculate_entropy(p1, p2):
    log_p1 = 0 if p1 == 0 else np.log2(p1)
    log_p2 = 0 if p2 == 0 else np.log2(p2)
    return -1 * (p1 * log_p1 + p2 * log_p2)

class SMJobManager:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)
        self.profile_frame = None
        self.block_frame = None
        self.features_frame = None
        self.train = None
        self.model = None
    def profile(self):
        data = {
            'inputDir': self.input_dir,
            'outputDir': self.output_dir,
            'containerUrl': self.profiler_url,
            'replicas': self.profiler_replicas
        }
        profiler_base_url = 'http://sm-mapper-' + os.environ['COLUMBUS_USERNAME'] + '/api/'
        response = requests.post(url=profiler_base_url + 'map', data=json.dumps(data), headers={'Authorization': self.auth_header, 'content-type': 'application/json'})
        profiler_id = response.json()['uid']
        sm_job = SMJob.objects.filter(uid=self.uid)[0]
        while(True):
            res = requests.get(url=profiler_base_url + 'status?uid=' + profiler_id)
            status = res.json()['fnStatus']
            if status == 'complete':
                return True
            elif status == 'running':
                if sm_job.long_status != res.json()['fnMessage'] :
                    sm_job.long_status = res.json()['fnMessage']
                sm_job.save()
    def block(self):
        blocker_url = 'http://blocker-' + os.environ['COLUMBUS_USERNAME'] + '/api/'
        data = {
            'aPath': self.output_dir + '/output.csv',
            'nA': self.blocker_chunks,
            'bPath': self.output_dir + '/output.csv',
            'nB': self.blocker_chunks,
            'containerUrl': self.blocker_url,
            'replicas': self.blocker_replicas
        }
        response = requests.post(url=blocker_url + 'block', data=json.dumps(data), headers={'Authorization': self.auth_header, 'content-type': 'application/json'})
        blocker_id = response.json()['uid']
        sm_job = SMJob.objects.filter(uid=self.uid)[0]
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
            'path': self.output_dir,
            'name': 'block.csv'
        }
        response = requests.post(url=blocker_url + 'save', data=json.dumps(data), headers={'Authorization': self.auth_header, 'content-type': 'application/json'})
        return True
    def featurize(self):
        featurizer_url = 'http://featurizer-' + os.environ['COLUMBUS_USERNAME'] + '/api/'
        data = {
            'aPath': self.output_dir + '/output.csv',
            'bPath': self.output_dir + '/output.csv',
            'cPath': self.output_dir + '/block.csv',
            'nC': self.featurizer_chunks,
            'containerUrl': self.featurizer_url,
            'replicas': self.featurizer_replicas
        }
        response = requests.post(url=featurizer_url + 'generate', data=json.dumps(data), headers={'Authorization': self.auth_header, 'content-type': 'application/json'})
        featurizer_id = response.json()['uid']
        sm_job = SMJob.objects.filter(uid=self.uid)[0]
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
            'path': self.output_dir,
            'name': 'features.csv'
        }
        response = requests.post(url=featurizer_url + 'save', data=json.dumps(data), headers={'Authorization': self.auth_header, 'content-type': 'application/json'})
        return True
    def generate_seed_rankings(self):
        pass
    def init_learner(self):
        sm_job = SMJob.objects.filter(uid=self.uid)[0]
        sm_job.stage = "Active Learning"
        sm_job.status = "Running"
        sm_job.long_status = "Initializing"
        sm_job.save()
        res = requests.get('http://cdrive/download/?path=' + self.output_dir + '/output.csv', headers={'Authorization': self.auth_header})
        self.profile_frame = pd.read_csv(res.json()['download_url'])
        res = requests.get('http://cdrive/download/?path=' + self.output_dir + '/block.csv', headers={'Authorization': self.auth_header})
        self.block_frame = pd.read_csv(res.json()['download_url'])
        res = requests.get('http://cdrive/download/?path=' + self.output_dir + '/features.csv', headers={'Authorization': self.auth_header})
        self.features_frame = pd.read_csv(res.json()['download_url']).sort_values('id').reset_index(drop=True)
        res = requests.get('http://cdrive/download/?path=' + self.seed_path, headers={'Authorization': self.auth_header})
        self.train = pd.read_csv(res.json()['download_url'])
        truncated_profiles = self.profile_frame[['id', 'name', 'dataset', 'sample']]
        truncated_profiles.to_csv(settings.DATA_PATH + '/' + self.uid + '/truncated-profiles.csv', index=False)
        f = open(settings.DATA_PATH + '/' + self.uid + '/truncated-profiles.csv','rb')
        file_name = 'truncated-profiles.csv'
        file_arg = {'file': (file_name, f), 'path': (None, self.output_dir)}
        requests.post('http://cdrive/upload/', files=file_arg, headers={'Authorization': self.auth_header})
        f.close()
    def run_iteration(self):
        self.current_iteration = self.current_iteration + 1
        sm_job = SMJob.objects.filter(uid=self.uid)[0]
        sm_job.stage = "Active Learning"
        sm_job.status = "Running"
        if self.current_iteration == 0:
            sm_job.long_status = "Initializing"
        else:
            sm_job.long_status = 'Iteration ' + str(self.current_iteration) + '/' + str(self.iterations) 
        sm_job.iteration = self.current_iteration
        sm_job.save()
        self.train = self.train.sort_values('id').reset_index(drop=True)
        self.model = RandomForestClassifier(n_estimators=self.n_estimators)
        X_train = self.features_frame[self.features_frame['id'].isin(self.train['id'])]
        del X_train['id']
        y_train = self.train['label'].values.ravel() 
        self.model.fit(X_train, y_train)
        X_test = self.features_frame[~self.features_frame['id'].isin(self.train['id'])]
        if ((self.current_iteration < self.iterations) and (len(X_test) > self.min_test_size)):
            entropies = pd.DataFrame()
            entropies['id'] = X_test['id']
            del X_test['id']
            probabilities = self.model.predict_proba(X_test)
            entropies['prob_0'] = probabilities[:,0]
            entropies["prob_1"] = probabilities[:,1]
            entropies["entropy"] = entropies.apply(lambda en: calculate_entropy(en.get("prob_0").item(), en.get("prob_1").item()), axis=1)
            new_examples = pd.DataFrame()
            new_examples[["id", "l_id", "r_id"]] = self.block_frame[self.block_frame["id"].isin(entropies.sort_values("entropy", ascending=False).head(self.batch_size)["id"])]
            self.create_labeling_task(new_examples)
        else:
            sm_job.status = "Complete"
            sm_job.long_status = "Training Complete"
            sm_job.save()
    def create_labeling_task(self, examples):
        task_name = 'iteration-' + str(self.current_iteration) + '-' + self.uid
        file_name = task_name + '.csv'
        file_path = settings.DATA_PATH + '/' + self.uid + '/' + file_name
        examples.to_csv(file_path, index=False)
        f = open(file_path,'rb')
        file_arg = {'file': (file_name, f), 'path': (None, self.output_dir)}
        requests.post('http://cdrive/upload/', files=file_arg, headers={'Authorization': self.auth_header})
        f.close()
        f = open('/options.json', 'rb')
        file_arg = {'file': ('options.json', f), 'path': (None, self.output_dir)}
        requests.post('http://cdrive/upload/', files=file_arg, headers={'Authorization': self.auth_header})
        f.close()
        data = {
            'retId': self.uid,
            'taskName': task_name, 
            'template': 'EMD',
            'dataPath': self.output_dir + '/truncated-profiles.csv',
            'examplesPath': self.output_dir + '/' + file_name,
            'labelOptionsPath': self.output_dir + '/options.json',
            'completionUrl': 'http://lynx-' + os.environ['COLUMBUS_USERNAME'] + '/api/complete-iteration/',
            'outputPath': self.output_dir,
            'outputName': task_name + '-labeled.csv'
        }
        res = requests.post('http://labeler-' + os.environ['COLUMBUS_USERNAME'] + '/api/create-task', data=json.dumps(data), headers={'Authorization': self.auth_header, 'content-type': 'application/json'}) 
        sm_job = SMJob.objects.filter(uid=self.uid)[0]
        sm_job.stage = 'Active Learning'
        sm_job.status = 'Ready'
        sm_job.labeling_url = os.environ['CDRIVE_URL'] + 'app/' + os.environ['COLUMBUS_USERNAME'] + '/labeler/example/' + task_name
        long_status = ""
        if self.current_iteration != 0:
            long_status = "Iteration " + str(self.current_iteration) + " complete. "
        sm_job.long_status = long_status + "Label examples for iteration " + str(self.current_iteration + 1)
        sm_job.save()
    def complete_iteration(self): 
        sm_job = SMJob.objects.filter(uid=self.uid)[0]
        sm_job.stage = 'Active Learning'
        sm_job.status = 'Running'
        sm_job.long_status = 'Iteration ' + str(self.current_iteration) + '/' + str(self.iterations) 
        sm_job.save()
        file_path = self.output_dir + '/iteration-' + str(self.current_iteration) + '-' + self.uid + '-labeled.csv'
        res = requests.get('http://cdrive/download/?path=' + file_path, headers={'Authorization': self.auth_header})
        new_examples = pd.read_csv(res.json()['download_url'])
        new_examples['label'] = new_examples['label'].map({'Yes': 1, 'No': 0})
        self.train = pd.concat([self.train, new_examples])
        self.run_iteration()
        return os.environ['CDRIVE_URL'] + 'app/' + os.environ['COLUMBUS_USERNAME'] + '/lynx/job/' + self.uid
    def save_model(self):
        file_name = 'iteration-' + str(self.current_iteration) + '-model.joblib'
        joblib.dump(self.model, settings.DATA_PATH + '/' + self.uid + '/' + file_name) 
    def upload_model(self):
        file_name = 'iteration-' + str(self.current_iteration) + '-model.joblib'
        f = open(settings.DATA_PATH + '/' + self.uid + '/' + file_name, 'rb')
        file_arg = {'file': (file_name, f), 'path': (None, self.output_dir)}
        requests.post('http://cdrive/upload/', files=file_arg, headers={'Authorization': self.auth_header})
    def apply_model(self):
        X_test = self.features_frame
        del X_test['id']
        predictions = pd.DataFrame()
        predictions[['id', 'l_id', 'r_id']] = self.block_frame
        predictions['label'] = self.model.predict(X_test)
        file_name = 'predictions.csv'
        file_path = settings.DATA_PATH + '/' + self.uid + '/' + file_name
        predictions.to_csv(file_path, index=False)
        f = open(file_path, 'rb')
        file_arg = {'file': (file_name, f), 'path': (None, self.output_dir)}
        requests.post('http://cdrive/upload/', files=file_arg, headers={'Authorization': self.auth_header})
