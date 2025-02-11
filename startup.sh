#!/bin/bash

# Update package list and install required system dependencies
apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libglib2.0-dev \
    libgthread-2.0-0 \
    libgtk2.0-dev \
    libsm6 \
    libxrender1 \
    libxext6

# Start the Gunicorn server
gunicorn app:app

