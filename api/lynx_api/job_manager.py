import requests, os, json, logging
from django.conf import settings
from .models import SMJob
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib
import py_cdrive_api

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
        self.seed_examples = None
        self.gold = None
        self.access_token = self.auth_header.split()[1]
    def profile(self):
        client = py_cdrive_api.Client(access_token=self.access_token)
        try:
            client.delete(self.output_dir + '/profiler')
        except py_cdrive_api.ForbiddenAccessException as e:
            pass
        client.create_folder(self.output_dir, 'profiler')
        data = {
            'inputDir': self.input_dir,
            'outputDir': self.output_dir + '/profiler',
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
                profile_url = client.file_url(self.output_dir + '/profiler/output.csv')
                self.profile_frame = pd.read_csv(profile_url)
                return True
            elif status == 'executing':
                if sm_job.long_status != status :
                    sm_job.status = 'Running'
                    sm_job.long_status = status
                    sm_job.save()
            elif status == 'error':
                sm_job.status = 'Error'
                sm_job.long_status = res.json()['message']
                sm_job.save()
                return False
                
            #elif status == 'running':
            #    if sm_job.long_status != res.json()['fnMessage'] :
            #        sm_job.long_status = res.json()['fnMessage']
            #   sm_job.save()
    def block(self):
        client = py_cdrive_api.Client(access_token=self.access_token)
        try:
            client.delete(self.output_dir + '/blocker')
        except py_cdrive_api.ForbiddenAccessException as e:
            pass 
        client.create_folder(self.output_dir, 'blocker')
        
        blocker_url = 'http://blocker-' + os.environ['COLUMBUS_USERNAME'] + '/api/'
        data = {
            'aPath': self.output_dir + '/profiler/output.csv',
            'nA': self.blocker_chunks,
            'bPath': self.output_dir + '/profiler/output.csv',
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
            elif status == 'Error':
                sm_job.status = status
                sm_job.long_status = res.json()['fnMessage']
                sm_job.save()
                return False

        data = {
            'uid': blocker_id,
            'path': self.output_dir + '/blocker',
            'name': 'block.csv'
        }
        response = requests.post(url=blocker_url + 'save', data=json.dumps(data), headers={'Authorization': self.auth_header, 'content-type': 'application/json'})
        block_url = client.file_url(self.output_dir + '/blocker/block.csv')
        self.block_frame = pd.read_csv(block_url)
        return True
    def create_seed_examples(self):
        self.seed_examples = pd.DataFrame()
        self.train = pd.DataFrame()
        s_id = self.profile_frame.sample().get('id').item()
        self.train = self.train.append({'id': len(self.block_frame) + 1, 'l_id': s_id, 'r_id': s_id, 'label': 1}, ignore_index=True)
        self.seed_examples = self.seed_examples.append({'id': len(self.block_frame) + 1, 'l_id': s_id, 'r_id': s_id}, ignore_index=True)
        s_id = self.profile_frame.sample().get('id').item()
        self.train = self.train.append({'id': len(self.block_frame) + 2, 'l_id': s_id, 'r_id': s_id, 'label': 1}, ignore_index=True)
        self.seed_examples = self.seed_examples.append({'id': len(self.block_frame) + 2, 'l_id': s_id, 'r_id': s_id}, ignore_index=True)
        self.seed_examples = self.seed_examples.append({'id': len(self.block_frame) + 3, 'l_id': self.profile_frame.sample().get('id').item(), 'r_id': self.profile_frame.sample().get('id').item()}, ignore_index=True)
        self.seed_examples = self.seed_examples.append({'id': len(self.block_frame) + 4, 'l_id': self.profile_frame.sample().get('id').item(), 'r_id': self.profile_frame.sample().get('id').item()}, ignore_index=True)
        self.seed_examples = self.seed_examples.append({'id': len(self.block_frame) + 5, 'l_id': self.profile_frame.sample().get('id').item(), 'r_id': self.profile_frame.sample().get('id').item()}, ignore_index=True)
    def featurize(self):
        client = py_cdrive_api.Client(access_token=self.access_token)
        try:
            client.delete(self.output_dir + '/featurizer')
        except py_cdrive_api.ForbiddenAccessException as e:
            pass 
        client.create_folder(self.output_dir, 'featurizer')
        sm_job = SMJob.objects.filter(uid=self.uid)[0]
        sm_job.stage = "Featurizer"
        sm_job.status = "Running"
        sm_job.long_status = "Initializing"
        sm_job.save()
        featurizer_input = pd.DataFrame()
        featurizer_input[['id', 'l_id', 'r_id']] = self.block_frame[['id', 'l_id', 'r_id']]
        featurizer_input = featurizer_input.append(self.seed_examples, ignore_index=True)
        featurizer_input = featurizer_input.astype(int)
        featurizer_input.to_csv(settings.DATA_PATH + '/' + self.uid + '/featurizer-input.csv', index=False)
        client.upload(settings.DATA_PATH + '/' + self.uid + '/featurizer-input.csv', self.output_dir + '/featurizer')
        featurizer_url = 'http://featurizer-' + os.environ['COLUMBUS_USERNAME'] + '/api/'
        data = {
            'aPath': self.output_dir + '/profiler/output.csv',
            'bPath': self.output_dir + '/profiler/output.csv',
            'cPath': self.output_dir + '/featurizer/featurizer-input.csv',
            'nC': self.featurizer_chunks,
            'containerUrl': self.featurizer_url,
            'replicas': self.featurizer_replicas
        }
        response = requests.post(url=featurizer_url + 'generate', data=json.dumps(data), headers={'Authorization': self.auth_header, 'content-type': 'application/json'})
        featurizer_id = response.json()['uid']
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
            elif status == 'Error':
                sm_job.status = status
                sm_job.long_status = res.json()['fnMessage']
                sm_job.save()
                return False

        data = {
            'uid': featurizer_id,
            'path': self.output_dir + '/featurizer',
            'name': 'features.csv'
        }
        response = requests.post(url=featurizer_url + 'save', data=json.dumps(data), headers={'Authorization': self.auth_header, 'content-type': 'application/json'})
        features_url = client.file_url(self.output_dir + '/featurizer/features.csv')
        self.features_frame = pd.read_csv(features_url).sort_values('id').reset_index(drop=True)
        return True
    def init_learner(self):
        client = py_cdrive_api.Client(access_token=self.access_token)
        try:
            client.delete(self.output_dir + '/learner')
        except py_cdrive_api.ForbiddenAccessException as e:
            pass 
        client.create_folder(self.output_dir, 'learner')
        sm_job = SMJob.objects.filter(uid=self.uid)[0]
        sm_job.stage = "Active Learning"
        sm_job.status = "Running"
        sm_job.long_status = "Initializing"
        sm_job.save()
        truncated_profiles = self.profile_frame[['id', 'name', 'dataset', 'sample']]
        truncated_profiles.to_csv(settings.DATA_PATH + '/' + self.uid + '/truncated-profiles.csv', index=False)
        client.upload(settings.DATA_PATH + '/' + self.uid + '/truncated-profiles.csv', self.output_dir + '/learner')
        client.upload('/options.json', self.output_dir + '/learner')
        if self.gold_path is not None:
            self.gold = pd.read_csv(client.file_url(self.gold_path))
        self.create_labeling_task(self.seed_examples.tail(3))
    def run_iteration(self):
        self.current_iteration = self.current_iteration + 1
        sm_job = SMJob.objects.filter(uid=self.uid)[0]
        sm_job.stage = "Active Learning"
        sm_job.status = "Running"
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
        if ((self.current_iteration <= self.iterations) and (len(X_test) > self.min_test_size)):
            entropies = pd.DataFrame()
            entropies['id'] = X_test['id']
            del X_test['id']
            probabilities = self.model.predict_proba(X_test)
            entropies['prob_0'] = probabilities[:,0]
            entropies['prob_1'] = probabilities[:,1]
            entropies['entropy'] = entropies.apply(lambda en: calculate_entropy(en.get("prob_0").item(), en.get("prob_1").item()), axis=1)
            new_examples = pd.DataFrame()
            new_examples[['id', 'l_id', 'r_id']] = self.block_frame[self.block_frame["id"].isin(entropies.sort_values("entropy", ascending=False).head(self.batch_size)["id"])][['id', 'l_id', 'r_id']]
            self.create_labeling_task(new_examples)
        else:
            client = py_cdrive_api.Client(access_token=self.access_token)
            try:
                client.delete(self.output_dir + '/apply-model')
            except py_cdrive_api.ForbiddenAccessException as e:
                pass
            client.create_folder(self.output_dir, 'apply-model')
            self.save_model(self.output_dir + '/learner')
            self.apply_model(self.output_dir + '/apply-model')
            sm_job.status = "Complete"
            sm_job.long_status = "Complete. Matches saved to " + self.output_dir + '/apply-model/matches.csv'
            sm_job.save()
    def create_labeling_task(self, examples):
        examples = examples.astype(int)
        task_name = 'iteration-' + str(self.current_iteration) + '-' + self.uid
        file_name = task_name + '.csv'
        file_path = settings.DATA_PATH + '/' + self.uid + '/' + file_name
        examples.to_csv(file_path, index=False)
        client = py_cdrive_api.Client(access_token=self.access_token)
        client.upload(file_path, self.output_dir + '/learner')
        if self.gold_path is None:
            data = {
                'retId': self.uid,
                'taskName': task_name, 
                'template': 'EMD',
                'dataPath': self.output_dir + '/learner/truncated-profiles.csv',
                'examplesPath': self.output_dir + '/learner/' + file_name,
                'labelOptionsPath': self.output_dir + '/learner/options.json',
                'completionUrl': 'http://lynx-' + os.environ['COLUMBUS_USERNAME'] + '/api/complete-iteration/',
                'outputPath': self.output_dir + '/learner',
                'outputName': task_name + '-labeled.csv'
            }
            res = requests.post('http://labeler-' + os.environ['COLUMBUS_USERNAME'] + '/api/create-task', data=json.dumps(data), headers={'Authorization': self.auth_header, 'content-type': 'application/json'}) 

            sm_job = SMJob.objects.filter(uid=self.uid)[0]
            sm_job.stage = 'Active Learning'
            sm_job.status = 'Ready'
            sm_job.labeling_url = os.environ['CDRIVE_URL'] + 'app/' + os.environ['COLUMBUS_USERNAME'] + '/labeler/example/' + task_name
            long_status = ""
            if self.current_iteration != 0:
                long_status = str(self.current_iteration - 1) + '/' + str(self.iterations) + ' iterations complete. '
                sm_job.long_status = long_status + "Label examples for iteration " + str(self.current_iteration)
            else:
                sm_job.long_status = "Label seed examples"
            sm_job.save()
        else:
            self.fake_label(task_name)
    def complete_iteration(self): 
        sm_job = SMJob.objects.filter(uid=self.uid)[0]
        sm_job.stage = 'Active Learning'
        sm_job.status = 'Running'
        sm_job.long_status = 'Iteration ' + str(self.current_iteration) + '/' + str(self.iterations) 
        sm_job.save()
        file_path = self.output_dir + '/learner/iteration-' + str(self.current_iteration) + '-' + self.uid + '-labeled.csv'
        client = py_cdrive_api.Client(access_token=self.access_token)
        file_url = client.file_url(file_path)
        new_examples = pd.read_csv(file_url)
        new_examples['label'] = new_examples['label'].map({'Yes': 1, 'No': 0})
        self.train = pd.concat([self.train, new_examples])
        self.run_iteration()
        return os.environ['CDRIVE_URL'] + 'app/' + os.environ['COLUMBUS_USERNAME'] + '/lynx/job/' + self.uid
    def fake_label(self, task_name):
        client = py_cdrive_api.Client(access_token=self.access_token)
        examples = pd.read_csv(client.file_url(self.output_dir + '/learner/' + task_name + '.csv'))
        if self.current_iteration == 0:
            examples['label'] = 'No'
        else:
            examples = self.block_frame[self.block_frame['id'].isin(examples['id'])]
            index = self.gold.set_index(list(self.gold.columns)).index
            examples.set_index(list(self.gold.columns), inplace=True)
            mask1 = examples.index.isin(index)
            inverted_columns = list(map(lambda x: 'r_' + x[2:] if x.startswith('l_') else 'l_' + x[2:], list(self.gold.columns)))
            examples.reset_index(inplace=True)
            examples.set_index(inverted_columns, inplace=True)
            mask2 = examples.index.isin(index)
            examples['label'] = mask1 | mask2
            examples['label'] = examples['label'].map({True: 'Yes', False: 'No'})
            examples.reset_index(drop=True, inplace=True)
        file_name = task_name + '-labeled.csv'
        file_path = settings.DATA_PATH + '/' + self.uid + '/' + file_name
        examples.to_csv(file_path, index=False)
        client.upload(file_path, self.output_dir + '/learner')
        self.complete_iteration()
    def save_model(self, path):
        file_name = 'iteration-' + str(self.current_iteration) + '-model.joblib'
        joblib.dump(self.model, settings.DATA_PATH + '/' + self.uid + '/' + file_name) 
        client = py_cdrive_api.Client(access_token=self.access_token)
        client.upload(settings.DATA_PATH + '/' + self.uid + '/' + file_name, path)
    def apply_model(self, path):
        X_test = self.features_frame[:-5]
        del X_test['id']
        predictions = self.block_frame.copy()
        predictions['label'] = self.model.predict(X_test)
        predictions = predictions[predictions['label'] == 1]
        del predictions['label']
        del predictions['id']
        predictions.insert(0, 'id', range(1, 1 + len(predictions)))
        file_name = 'matches.csv'
        file_path = settings.DATA_PATH + '/' + self.uid + '/' + file_name
        predictions.to_csv(file_path, index=False)
        client = py_cdrive_api.Client(access_token=self.access_token)
        client.upload(file_path, path)
    def calculate_accuracy(self):
        client = py_cdrive_api.Client(access_token=self.access_token)
        predictions = pd.read_csv(client.file_url(self.output_dir + '/apply-model/matches.csv'))
        index = self.gold.set_index(list(self.gold.columns)).index
        predictions.set_index(list(self.gold.columns), inplace=True)
        mask1 = predictions.index.isin(index)
        inverted_columns = list(map(lambda x: 'r_' + x[2:] if x.startswith('l_') else 'l_' + x[2:], list(self.gold.columns)))
        predictions.reset_index(inplace=True)
        predictions.set_index(inverted_columns, inplace=True)
        mask2 = predictions.index.isin(index)
        predictions['ground_truth'] = mask1 | mask2
        relevant_docs = len(predictions[predictions['ground_truth']==True])
        precision = relevant_docs/len(predictions)
        recall = relevant_docs/(2*len(self.gold))
        f1_score = 2/(1/precision + 1/recall)
        return ({'precision': precision, 'recall': recall, 'f1Score': f1_score})
