#!/bin/bash

# Update package list and install required system dependencies
apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0

# Start the Gunicorn server
gunicorn app:app

