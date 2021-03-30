#!/bin/bash
##################################################
# ReportHub Backup Cleanup Script
# Steps
#   - remove files and folders more than number of DAYS
#
##################################################

DIR=/home/ubuntu/data/reportHub/


if [ "$#" -eq  "0" ]
then
    DAYS=100
else
    DAYS=$1
fi

echo "RUNNING OVER $DAYS DAYS FOLDER CLEANUP"

sudo find $DIR -mindepth 1 -mtime +$DAYS -delete

echo "DONE"

