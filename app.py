from flask import Flask, request, jsonify
from flask_cors import CORS
from googletrans import Translator
from gtts import gTTS
import cv2
from ultralytics import YOLO
import numpy as np
import logging
from io import BytesIO
import base64

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# Load BOTH YOLO models:
#  - best.pt for American sign language
#  - isl_best.pt for Indian sign language
model_american = YOLO("best.pt")
model_indian = YOLO("isl_best.pt")

# Initialize translator for TTS translation
translator = Translator()

@app.route('/')
def home():
    return "Flask backend is running! 🚀", 200

@app.route('/detect', methods=['POST'])
def detect():
    """
    Reads 'modelType' from form data:
      - 'american' => use best.pt
      - 'indian'   => use isl_best.pt
    Defaults to 'american' if not specified.
    """
    try:
        file = request.files['frame']
        file_bytes = file.read()
        logging.debug(f"Received frame of size: {len(file_bytes)} bytes")
        file.seek(0)
        npimg = np.frombuffer(file_bytes, np.uint8)
        frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        model_type = request.form.get("modelType", "american")
        if model_type == "indian":
            chosen_model = model_indian
        else:
            chosen_model = model_american

        results = chosen_model.predict(source=frame, conf=0.25)
        detections = []
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0]
                conf = box.conf[0]
                label = result.names[int(box.cls)]
                detections.append({
                    'x1': int(x1),
                    'y1': int(y1),
                    'x2': int(x2),
                    'y2': int(y2),
                    'label': label,
                    'confidence': float(conf)
                })

        logging.debug(f"Detections: {detections}")
        return jsonify(detections)
    except Exception as e:
        logging.error(f"Error during detection: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/translate', methods=['POST', 'OPTIONS'])
def translate_text():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        data = request.get_json()
        text = data.get("text")
        target_language = data.get("language")
        if not text or not target_language:
            return jsonify({"error": "Missing text or language"}), 400

        translated = translator.translate(text, dest=target_language)

        # Generate audio in memory without saving to disk
        fp = BytesIO()
        tts = gTTS(translated.text, lang=target_language)
        tts.write_to_fp(fp)
        fp.seek(0)
        b64_audio = base64.b64encode(fp.read()).decode('utf-8')
        data_url = "data:audio/mp3;base64," + b64_audio

        return jsonify({
            "translated_text": translated.text,
            "audio_url": data_url
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
