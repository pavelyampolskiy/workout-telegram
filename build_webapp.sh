#!/bin/sh
# Build webapp for production so api.py can serve it from webapp/dist
cd webapp && npm ci && npm run build
