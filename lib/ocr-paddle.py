#!/usr/bin/env python3
"""
PaddleOCR script for text extraction from images
Requires: pip install paddlepaddle paddleocr
"""
import sys
import json
import base64
from paddleocr import PaddleOCR

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}), file=sys.stderr)
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    try:
        # Initialize PaddleOCR - use_lang=False for English only (faster)
        ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)
        
        # Perform OCR
        result = ocr.ocr(image_path, cls=True)
        
        # Extract text from results
        text_lines = []
        if result and result[0]:
            for line in result[0]:
                if line and len(line) >= 2:
                    text_lines.append(line[1][0])  # Extract text from detection
        
        full_text = '\n'.join(text_lines)
        
        # Return as JSON
        print(json.dumps({
            "success": True,
            "text": full_text,
            "lines": text_lines
        }))
        
    except Exception as e:
        print(json.dumps({
            "error": str(e)
        }), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()


