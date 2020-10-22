import requests, os, json, logging
from django.conf import settings
from .models import SMJob
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib
import py_cdrive_api
import time

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
            'inputFolderPath': self.input_dir,
            'outputPath': self.output_dir + '/profiler',
            'outputName': 'traits.csv',
            'imageUrl': self.profiler_url,
            'workers': self.profiler_replicas
        }
        profiler_base_url = 'http://mapper-' + os.environ['COLUMBUS_USERNAME'] + '/'
        response = requests.post(url=profiler_base_url + 'create', data=data, headers={'Authorization': self.auth_header})
        profiler_id = response.json()['uid']
        sm_job = SMJob.objects.filter(uid=self.uid)[0]

        response = requests.post(url=profiler_base_url + 'status?uid=' + profiler_id, stream=True)
        for line in response.iter_lines():
            if line:
                status_json = json.loads(line.decode('utf-8'))
                if "conditions" in status_json and status_json["conditions"][0]["type"] == "Complete":
                    traits_path = '{}/profiler'.format(self.output_dir)
                    traits_file = '{}/traits.csv'.format(traits_path)
                    attempts = 0
                    while(True):
                        try:
                            profile_url = client.file_url(traits_file)
                            break
                        except Exception as e:
                            attempts += 1
                            if attempts > 10:
                                raise(e)
                            else:
                                time.sleep(2)
                    self.profile_frame = pd.read_csv(profile_url)
                    client.delete(traits_file)
                    del self.profile_frame['column_id']
                    self.profile_frame['column_id'] = self.profile_frame.index + 1
                    self.profile_frame.to_csv('/storage/traits.csv', index=False)
                    client.upload('/storage/traits.csv', traits_path)
                    self.profile_frame.rename({'column_id': 'id'}, axis='columns', inplace=True)
                    response = requests.post(url=profiler_base_url + 'delete', data={'uid':profiler_id}, headers={'Authorization': self.auth_header})
                    return True
                else:
                    if sm_job.long_status != 'Executing' :
                        sm_job.status = 'Running'
                        sm_job.long_status = 'Executing'
                        sm_job.save()

    def block(self):
        client = py_cdrive_api.Client(access_token=self.access_token)
        try:
            client.delete(self.output_dir + '/blocker')
        except py_cdrive_api.ForbiddenAccessException as e:
            pass 
        client.create_folder(self.output_dir, 'blocker')
        sm_job = SMJob.objects.filter(uid=self.uid)[0]
        sm_job.stage = "Blocking"
        sm_job.status = "Running"
        sm_job.long_status = "Initializing"
        sm_job.long_status = "Initializing"
        sm_job.save()
        data = {
            'inputFolderPath': self.output_dir + '/profiler',
            'outputPath': self.output_dir + '/blocker',
            'outputName': 'candidates.csv',
            'imageUrl': self.blocker_url,
            'workers': self.blocker_replicas
        }
        blocker_base_url = 'http://mapper-' + os.environ['COLUMBUS_USERNAME'] + '/'
        response = requests.post(url=blocker_base_url + 'create', data=data, headers={'Authorization': self.auth_header})
        blocker_id = response.json()['uid']
        response = requests.post(url=blocker_base_url + 'status?uid=' + blocker_id, stream=True)
        for line in response.iter_lines():
            if line:
                status_json = json.loads(line.decode('utf-8'))
                if "conditions" in status_json and status_json["conditions"][0]["type"] == "Complete":
                    candidates_path = '{}/blocker'.format(self.output_dir)
                    candidates_file = '{}/candidates.csv'.format(candidates_path)
                    attempts = 0
                    while(True):
                        try:
                            block_url = client.file_url(candidates_file)
                            break
                        except Exception as e:
                            attempts += 1
                            if attempts > 10:
                                raise(e)
                            else:
                                time.sleep(2)
                    self.block_frame = pd.read_csv(block_url)
                    client.delete(candidates_file)
                    del self.block_frame['Unnamed: 0']
                    self.block_frame.insert(0, 'id', range(1, 1+len(self.block_frame)))
                    self.block_frame.to_csv('/storage/candidates.csv', index=False)
                    client.upload('/storage/candidates.csv', candidates_path)
                    response = requests.post(url=blocker_base_url + 'delete', data={'uid':blocker_id}, headers={'Authorization': self.auth_header})
                    return True
                else:
                    if sm_job.long_status != 'Executing' :
                        sm_job.status = 'Running'
                        sm_job.long_status = 'Executing'
                        sm_job.save()

    def create_seed_examples(self):
        self.seed_examples = pd.DataFrame()
        self.train = pd.DataFrame()
        s_id = self.profile_frame.sample().get('id').item()
        self.train = self.train.append({'id': len(self.block_frame) + 1, 'label': 1}, ignore_index=True)
        self.seed_examples = self.seed_examples.append({'id': len(self.block_frame) + 1, 'l_id': s_id, 'r_id': s_id}, ignore_index=True)
        s_id = self.profile_frame.sample().get('id').item()
        self.train = self.train.append({'id': len(self.block_frame) + 2, 'label': 1}, ignore_index=True)
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
        client.create_folder(self.output_dir, 'catalog')

        client.download_file(self.input_dir + '/catalog/catalog.csv', '/storage')
        client.upload('/storage/catalog.csv', self.output_dir + '/catalog/catalog.csv')

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

        data = {
            'inputFolderPath': self.output_dir,
            'outputPath': self.output_dir + '/featurizer',
            'outputName': 'features.csv',
            'imageUrl': self.featurizer_url,
            'workers': self.featurizer_replicas
        }
        featurizer_base_url = 'http://mapper-' + os.environ['COLUMBUS_USERNAME'] + '/'
        response = requests.post(url=featurizer_base_url + 'create', data=data, headers={'Authorization': self.auth_header})
        featurizer_id = response.json()['uid']
        response = requests.post(url=featurizer_base_url + 'status?uid=' + featurizer_id, stream=True)

        for line in response.iter_lines():
            if line:
                status_json = json.loads(line.decode('utf-8'))
                if "conditions" in status_json and status_json["conditions"][0]["type"] == "Complete":
                    attempts = 0
                    while(True):
                        try:
                            features_url = client.file_url(self.output_dir + '/featurizer/features.csv')
                            break
                        except Exception as e:
                            attempts += 1
                            if attempts > 10:
                                raise(e)
                            else:
                                time.sleep(2)
                    self.features_frame = pd.read_csv(features_url).sort_values('id').reset_index(drop=True)
                    response = requests.post(url=featurizer_base_url + 'delete', data={'uid':featurizer_id}, headers={'Authorization': self.auth_header})
                    return True
                else:
                    if sm_job.long_status != 'Executing' :
                        sm_job.status = 'Running'
                        sm_job.long_status = 'Executing'
                        sm_job.save()
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
        truncated_profiles = self.profile_frame[['id', 'dataset', 'column', 'sample']]
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
        import pdb
        pdb.set_trace()
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
            sm_job.status = "Apply Model"
            sm_job.status = "Complete"
            sm_job.long_status = "Training complete. Model applied to blocking output. Matches saved to " + self.output_dir + '/apply-model/matches.csv'
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
            if self.current_iteration == 0:
                sm_job.long_status = "Labeling seed examples"
            elif self.current_iteration == 1:
                sm_job.long_status = 'Finished labeling seed examples. Labeling examples for iteration 1/' + str(self.iterations) + '.'
            else:
                sm_job.long_status = 'Finished labeling examples for iteration ' + str(self.current_iteration - 1) + '/' + str(self.iterations) + '. Labeling examples for iteration ' + str(self.current_iteration) + '/' + str(self.iterations) + '.'
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
        self.train = pd.concat([self.train, new_examples]).astype(int)
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
        precision = relevant_docs/len(predictions)
        recall = relevant_docs/(2*len(self.gold))
        f1_score = 2/(1/precision + 1/recall)
        return ({'precision': precision, 'recall': recall, 'f1Score': f1_score})
