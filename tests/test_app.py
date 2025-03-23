import unittest
import base64
import json
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import sys
import os
import logging
from unittest.mock import patch, MagicMock

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app

class TestApp(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        # Disable logging during tests
        logging.disable(logging.CRITICAL)

    def tearDown(self):
        # Re-enable logging after tests
        logging.disable(logging.NOTSET)

    def create_test_image(self, text="Test", size=(100, 30), color='white'):
        # Create an image with actual text
        img = Image.new('RGB', size, color=color)
        draw = ImageDraw.Draw(img)
        draw.text((10, 10), text, fill='black')
        img_byte_arr = BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        return base64.b64encode(img_byte_arr).decode('utf-8')

    def test_root_endpoint(self):
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'OCR API is running', response.data)

    def test_extract_text_no_image(self):
        response = self.app.post('/api/extract-text', json={})
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'No image data provided')

    def test_extract_text_invalid_json(self):
        response = self.app.post('/api/extract-text', data='invalid json')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Invalid JSON data')

    def test_extract_text_invalid_image_data(self):
        response = self.app.post('/api/extract-text', json={'image': 'invalid_base64'})
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Invalid image data')

    def test_extract_text_invalid_base64_padding(self):
        response = self.app.post('/api/extract-text', json={'image': 'data:image/png;base64,abc'})
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Invalid image data')

    def test_extract_text_invalid_image_format(self):
        # Create a text file instead of an image
        text_data = b'This is not an image'
        base64_data = base64.b64encode(text_data).decode('utf-8')
        response = self.app.post('/api/extract-text', 
                               json={'image': f'data:image/png;base64,{base64_data}'})
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Invalid image format')

    @patch('pytesseract.image_to_string')
    def test_extract_text_valid_image(self, mock_tesseract):
        mock_tesseract.return_value = 'Test text'
        image_data = self.create_test_image()
        response = self.app.post('/api/extract-text', 
                               json={'image': f'data:image/png;base64,{image_data}'})
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('text', data)
        self.assertEqual(data['text'], 'Test text')

    def test_extract_text_large_image(self):
        # Create a large test image (10MB)
        img = Image.new('RGB', (2000, 2000), color='white')
        img_byte_arr = BytesIO()
        img.save(img_byte_arr, format='PNG', optimize=False, quality=100)
        # Add padding to ensure the file is over 5MB
        padding = b'0' * (6 * 1024 * 1024)
        img_byte_arr.write(padding)
        large_image = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')

        response = self.app.post('/api/extract-text', 
                               json={'image': f'data:image/png;base64,{large_image}'})
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'File size too large (max 5MB)')

    @patch('pytesseract.image_to_string')
    def test_extract_text_tesseract_error(self, mock_tesseract):
        mock_tesseract.side_effect = Exception('Tesseract error')
        image_data = self.create_test_image()
        response = self.app.post('/api/extract-text', 
                               json={'image': f'data:image/png;base64,{image_data}'})
        
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Error processing image')

    @patch('pytesseract.image_to_string')
    def test_extract_text_empty_result(self, mock_tesseract):
        mock_tesseract.return_value = ''
        image_data = self.create_test_image()
        response = self.app.post('/api/extract-text', 
                               json={'image': f'data:image/png;base64,{image_data}'})
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'No text found in image')

    def test_cors_headers(self):
        response = self.app.options('/api/extract-text')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Access-Control-Allow-Origin', response.headers)
        self.assertEqual(response.headers['Access-Control-Allow-Origin'], '*')
        self.assertIn('Access-Control-Allow-Methods', response.headers)
        self.assertIn('Access-Control-Allow-Headers', response.headers)

    @patch('pytesseract.image_to_string')
    def test_extract_text_different_image_formats(self, mock_tesseract):
        mock_tesseract.return_value = 'Test text'
        for fmt in ['PNG', 'JPEG', 'BMP']:
            with self.subTest(format=fmt):
                img = Image.new('RGB', (100, 30), color='white')
                img_byte_arr = BytesIO()
                img.save(img_byte_arr, format=fmt)
                img_byte_arr = img_byte_arr.getvalue()
                image_data = base64.b64encode(img_byte_arr).decode('utf-8')
                
                response = self.app.post('/api/extract-text', 
                                       json={'image': f'data:image/{fmt.lower()};base64,{image_data}'})
                
                self.assertEqual(response.status_code, 200)
                data = json.loads(response.data)
                self.assertIn('text', data)
                self.assertEqual(data['text'], 'Test text')

    @patch('pytesseract.image_to_string')
    def test_extract_text_image_preprocessing(self, mock_tesseract):
        mock_tesseract.return_value = 'Test text'
        # Test with different image modes
        for mode in ['RGB', 'RGBA', 'L']:
            with self.subTest(mode=mode):
                img = Image.new(mode, (100, 30), color='white')
                img_byte_arr = BytesIO()
                img.save(img_byte_arr, format='PNG')
                img_byte_arr = img_byte_arr.getvalue()
                image_data = base64.b64encode(img_byte_arr).decode('utf-8')
                
                response = self.app.post('/api/extract-text', 
                                       json={'image': f'data:image/png;base64,{image_data}'})
                
                self.assertEqual(response.status_code, 200)
                data = json.loads(response.data)
                self.assertIn('text', data)
                self.assertEqual(data['text'], 'Test text')

    @patch('pytesseract.image_to_string')
    @patch('os.remove')
    def test_temp_file_cleanup(self, mock_remove, mock_tesseract):
        mock_tesseract.return_value = 'Test text'
        image_data = self.create_test_image()
        response = self.app.post('/api/extract-text', 
                               json={'image': f'data:image/png;base64,{image_data}'})
        
        self.assertEqual(response.status_code, 200)
        mock_remove.assert_called()

if __name__ == '__main__':
    unittest.main() 