from PIL import Image, ImageDraw, ImageFont
import io
import base64
import os

# Create a new image with a white background
width = 800
height = 200
image = Image.new('RGB', (width, height), 'white')

# Get a drawing context
draw = ImageDraw.Draw(image)

# Try to load a system font
try:
    # For macOS
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 72)
except:
    try:
        # For Linux
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 72)
    except:
        # Fallback to default
        font = ImageFont.load_default()

# Draw some text
text = "Hello World!"
text_bbox = draw.textbbox((0, 0), text, font=font)
text_width = text_bbox[2] - text_bbox[0]
text_height = text_bbox[3] - text_bbox[1]

# Center the text
x = (width - text_width) // 2
y = (height - text_height) // 2

# Draw text with black color
draw.text((x, y), text, font=font, fill='black')

# Save the image
image.save('test.png')

# Convert to base64
with open('test.png', 'rb') as image_file:
    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

print(f"data:image/png;base64,{encoded_string}") 