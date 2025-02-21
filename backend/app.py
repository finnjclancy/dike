from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from openai import OpenAI
from config import LIFE_INSURANCE_RULES  # Import chatbot rules

# Load API Key
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = Flask(__name__)
CORS(app)

# Create an "uploads" folder if it doesn't exist
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Start conversation with imported rules
conversation = [{"role": "system", "content": LIFE_INSURANCE_RULES}]

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get("message")
    conversation.append({"role": "user", "content": user_message})

    # Call OpenAI API
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=conversation,
        temperature=0.0
    )

    bot_reply = response.choices[0].message.content
    conversation.append({"role": "assistant", "content": bot_reply})

    return jsonify({"response": bot_reply})

# File upload route
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"message": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(file_path)

    return jsonify({"message": f"✅ File '{file.filename}' uploaded successfully!"})

@app.route('/rephrase', methods=['POST'])
def rephrase_question():
    data = request.json
    original_question = data.get("question", "")

    if not original_question:
        return jsonify({"error": "No question provided"}), 400

    # Call OpenAI API to rephrase the question
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful assistant. Rephrase the given question naturally while keeping its meaning the same."},
            {"role": "user", "content": f"Rephrase this question naturally: '{original_question}'"}
        ],
        temperature=0.7
    )

    rephrased_question = response.choices[0].message.content.strip()
    return jsonify({"rephrased_question": rephrased_question})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
