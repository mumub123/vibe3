#!/bin/bash

# Run frontend tests
echo "Running frontend tests..."
cd frontend && npm test

# Run backend tests
echo -e "\nRunning backend tests..."
cd ..
python -m pytest tests/ -v 