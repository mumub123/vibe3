# Image to Text Converter

This web application allows users to upload images, extract text from them using OCR (Optical Character Recognition), and download the extracted text as a file.

## Prerequisites

- Python 3.7+
- Node.js 14+
- Tesseract OCR

### Installing Tesseract OCR

#### macOS

```bash
brew install tesseract
```

#### Ubuntu/Debian

```bash
sudo apt-get install tesseract-ocr
```

#### Windows

Download the installer from: https://github.com/UB-Mannheim/tesseract/wiki

## Setup

1. Set up the Python backend:

```bash
# Create and activate a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

2. Set up the React frontend:

```bash
cd frontend
npm install
```

## Running the Application

1. Start the Python backend:

```bash
python app.py
```

2. In a new terminal, start the React frontend:

```bash
cd frontend
npm run dev
```

3. Open your browser and navigate to the URL shown in the frontend terminal (typically http://localhost:5173)

## Features

- Upload images
- Extract text using OCR
- View extracted text
- Download extracted text as a .txt file
- Modern, responsive UI using Chakra UI
- Error handling and loading states
