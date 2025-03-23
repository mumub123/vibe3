import os
import base64
import logging
import pytesseract
from PIL import Image
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Get Tesseract version and command
try:
    tesseract_version = pytesseract.get_tesseract_version()
    tesseract_cmd = pytesseract.pytesseract.tesseract_cmd
    logger.info(f"Tesseract version: {tesseract_version}")
    logger.info(f"Tesseract command: {tesseract_cmd}")
except Exception as e:
    logger.error(f"Error getting Tesseract info: {str(e)}")

@app.route('/')
def home():
    return 'OCR API is running'

@app.route('/api/extract-text', methods=['POST', 'OPTIONS'])
def extract_text():
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    # Check if request contains JSON data
    if not request.is_json:
        return jsonify({'error': 'Invalid JSON data'}), 400

    data = request.get_json()
    
    # Check if image data is provided
    if not data or 'image' not in data:
        return jsonify({'error': 'No image data provided'}), 400

    # Extract base64 image data
    image_data = data['image']
    if not image_data.startswith('data:image/'):
        return jsonify({'error': 'Invalid image data'}), 400

    # Extract the base64 part after the comma
    try:
        base64_data = re.sub('^data:image/.+;base64,', '', image_data)
        image_bytes = base64.b64decode(base64_data)
    except Exception:
        return jsonify({'error': 'Invalid image data'}), 400

    # Check file size (5MB limit)
    if len(image_bytes) > 5 * 1024 * 1024:  # 5MB in bytes
        return jsonify({'error': 'File size too large (max 5MB)'}), 400

    # Create a temporary file to save the image
    temp_path = 'temp_image.png'
    try:
        # Try to open the image
        try:
            image = Image.open(BytesIO(image_bytes))
        except Exception:
            return jsonify({'error': 'Invalid image format'}), 400

        # Convert RGBA to RGB if needed
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        
        # Save the image temporarily with format specified
        image.save(temp_path, format='PNG')
        
        # Perform OCR
        try:
            extracted_text = pytesseract.image_to_string(image)
        except Exception as e:
            logger.error(f"Error during OCR: {str(e)}")
            return jsonify({'error': 'Error processing image'}), 500

        # Check if any text was found
        if not extracted_text.strip():
            return jsonify({'error': 'No text found in image'}), 400
            
        return jsonify({'text': extracted_text.strip()})
            
    finally:
        # Clean up temporary file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                logger.error(f"Error removing temporary file: {str(e)}")

if __name__ == '__main__':
    logger.info('Starting HTTPS server on port 5001')
    app.run(host='0.0.0.0', port=5001, ssl_context='adhoc', debug=True) 