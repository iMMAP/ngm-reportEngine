#!/bin/bash
##################################################
# ReportHub Backup Cleanup Script
# Steps
#   - remove files and folders more than number of DAYS
#
##################################################
DIR=/home/ubuntu/data/reportHub/

DAYS=100

sudo find $DIR -mindepth 1 -mtime +$DAYS -delete
