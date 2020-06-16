import requests, json, py_cdrive_api, time, argparse

try:
    client = py_cdrive_api.Client(domain='col4infa.io')
except Exception as e:
    print(e)

parser = argparse.ArgumentParser(description='Lynx Simulator')
parser.add_argument('-i', '--input-dir', help='Path to profiler input')
parser.add_argument('-o', '--output-dir', help='Path to lynx output')
parser.add_argument('-g', '--gold', help='Path to gold labels')
parser.add_argument('-c', '--config', help='Path to config')

options = parser.parse_args()

if options.input_dir is None:
    raise Exception("Please pass input directory with -i flag")
if options.output_dir is None:
    raise Exception("Please pass output directory with -o flag")
if options.gold is None:
    raise Exception("Please pass gold labels with -g flag")
input_dir = options.input_dir
output_dir = options.output_dir
gold = options.gold

# Initialize py_cdrive_api client
client = py_cdrive_api.Client(domain='col4infa.io')

# Get Config from default_config.json
config_path = 'users/' + client.username + '/apps/lynx/default_config.json' if options.config is None else options.config
config_url = client.file_url(config_path)
config = json.loads(requests.get(config_url).text)

# Lynx inputs
data = {
    'inputPath': input_dir,
    'outputPath': output_dir,
    'goldPath': gold,
    **config
}

# Get access token for Lynx from CDrive client
token = client.app_token('lynx')
app_url = 'https://col4infa.io/app/' + client.username + '/lynx/api'

# Start the Lynx task, store the task Id returned
resp = requests.post(
    url = app_url + '/execute-workflow/', 
    data = data,
    headers = {'Authorization': 'Bearer ' + token}
)
if resp.status_code != 200:
    raise Exception('Error occured while creating matching task')
uid = resp.json()['uid']

# Check status for task with Id = uid, and print status to console
while True:
    resp = requests.get(
        url = app_url + '/api/status/?uid=' + uid, 
        headers = {'Authorization': 'Bearer ' + token}
    )
    if resp.status_code != 200:
        raise Exception('Error occured while reading the status of task ' + uid)
    data = resp.json()
    if data['status'] == 'Complete':
        break
    elif data['status'] == 'Error':
        raise Exception('stage: ' + data['stage'] + ', status: ' + data['status'] + ', long status: ', data['long_status'])
    elif data['status'] == 'Running':
        print('stage: ' + data['stage'] + ', status: ' + data['status'] + ', long status: ', data['long_status'])
    time.sleep(3)

# Lynx has finished executing, calculate precision, recall and print to console
resp = requests.get(
    url = app_url + '/api/accuracy/?uid=' + uid, 
    headers = {'Authorization': 'Bearer ' + token}
)
accuracy = resp.json()
print('Precision: ' + str(accuracy['precision']))
print('Recall: ' + str(accuracy['recall']))
print('F1 Score: ' + str(accuracy['f1Score']))
