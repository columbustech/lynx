#!/bin/bash
mkdir -p /storage/public/
cp -r /ui/build/* /storage/public/
service nginx start &
python3 manage.py migrate && python3 manage.py runserver 0.0.0.0:8001
