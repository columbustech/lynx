# Using this simulator

## Create a CDrive Account

Create an account on your CDrive deployment.

## Install py\_cdrive\_api Package

Install py\_cdrive\_api package from PyPi on local machine:

```bash
pip install py-cdrive-api
```
## Set Environment Variables

Set environment variables COLUMBUS\_USERNAME, COLUMBUS\_PASSWORD and COLUMBUS\_DOMAIN. For example:

```bash
export COLUMBUS_USERNAME=foo
export COLUMBUS_PASSWORD=fooPass4*
export COLUMBUS_DOMAIN=my-columubus-deployment.io
```
## Config file

Create a lynx config file either on local machine or CDrive. This file can also be created using the lynx app on CDrive.

## Run Simulator

Run simulator.py. It takes in the following arguments:

1. -i, --input-dir : Local path to input directory for Lynx profiler.
2. -o, --output-dir : CDrive path to output directory where matches and other intermediate output will be saved.
3. -g, --gold : CDrive path for gold matches file 
4. -u, --upload : \[OPTIONAL\] Local path to data lake. If specified, contents of this directory will be uploaded from local machine to 
CDrive input directory.
5. -c, --config : \[OPTIONAL\] Local or CDrive path to config file. If CDrive path, preface with cdrive://. Eg: cdrive://users/foo/datalake. 
If this argument is not specified, simulator will look for default\_config.json in cdrive://users/\<username\>/apps/lynx.

Sample Usage:

```
python simulator.py -i users/foo/datalake/csv -o users/foo/datalake/lynx-output -u ~/home/foo/datalake -g users/foo/datalake/gold.csv
```
Simulator will save the matches, the model learnt and intermediate outputs to the output directory specified. The simulator will then print
accuracy numbers (precision, recall, f1 score) for the job.
