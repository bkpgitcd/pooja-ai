#!/usr/bin/env python3
"""
Pooja AI - Voice Communication Assistant Backend
FastAPI server for production deployment
"""

import os
import json
import urllib.request
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API keys
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
GOOGLE_TTS_API_KEY = os.environ.get('GOOGLE_TTS_API_KEY', '')

# Initialize FastAPI app
app = FastAPI(
    title="Pooja AI API",
    description="Voice Communication Assistant for hotel hospitality",
    version="1.0.0"
)

# CORS middleware
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== DATA MODELS ====================

class ConversationItem(BaseModel):
    role: str
    text: str

class GenerateRequest(BaseModel):
    patronText: str
    conversationHistory: List[ConversationItem] = []
    selectedLanguage: str = 'en-US'

class TTSRequest(BaseModel):
    text: str
    language: str = 'en-US'

class ResponseOption(BaseModel):
    response: str
    tone: str

# ==================== HELPER FUNCTIONS ====================

def get_language_instruction(lang):
    """Get instruction for Claude"""
    if lang == 'Hindi':
        return 'Hindi in Devanagari script (हिंदी)'
    elif lang == 'Tamil':
        return 'Tamil in Tamil script (தமிழ்)'
    elif lang == 'Rajasthani':
        return 'Rajasthani in Devanagari script (राजस्थानी)'
    else:
        return 'English'


def call_anthropic_api(patron_text, conversation_history, forced_language='English'):
    """Call Anthropic Claude API"""
    context = '\n'.join([f"{h.role}: {h.text}" for h in conversation_history[-4:]])
    
    detected_lang = forced_language
    lang_instruction = get_language_instruction(detected_lang)
    
    print(f"[LANGUAGE] Using: {detected_lang} for text: '{patron_text[:50]}'")
    
    # Language-specific examples
    examples = {
        'Tamil': 'வணக்கம், நான் உங்களுக்கு உதவ மகிழ்ச்சியாக இருக்கிறேன்',
        'Hindi': 'नमस्ते, मैं आपकी मदद करने के लिए खुश हूं',
        'Rajasthani': 'खम्मा घणी, म्हैं थांनै मदद करण खातर राजी हूं',
        'English': 'Hello, I am happy to help you'
    }
    example = examples.get(detected_lang, examples['English'])
    
    prompt = f"""You are helping Pooja, a hotel staff member who cannot speak. A patron just said: "{patron_text}"

Context: Pooja works at the chai/tea area in a Double Tree Hilton hotel in Jaipur, India. She is warm, professional, and hospitable.

ABSOLUTE LANGUAGE REQUIREMENT - THIS IS CRITICAL:
- The patron selected: {detected_lang}
- You MUST respond ONLY in {detected_lang} using {lang_instruction}
- EVERY SINGLE WORD must be in {detected_lang}
- DO NOT use ANY Hindi words if responding in Tamil
- DO NOT use ANY Tamil words if responding in Hindi  
- DO NOT use ANY English words unless responding in English
- DO NOT mix scripts - use ONLY ONE script throughout

SCRIPT RULES:
- Tamil responses: Use ONLY Tamil script (தமிழ் எழுத்துகள்) - Example: "{example if detected_lang == 'Tamil' else examples['Tamil']}"
- Hindi responses: Use ONLY Devanagari script (देवनागरी) - Example: "{example if detected_lang == 'Hindi' else examples['Hindi']}"
- English responses: Use ONLY English alphabet

Generate EXACTLY 4 response options. Each should be:
- Written 100% in {lang_instruction} with ZERO words from other languages
- Appropriate for hotel hospitality (tea service)
- Natural and conversational in {detected_lang}
- Concise (1-2 sentences)
- Different tones: formal, warm, friendly, enthusiastic

Previous context: {context}

Return ONLY valid JSON array:
[
  {{"response": "PURE {detected_lang} response here", "tone": "formal"}},
  {{"response": "PURE {detected_lang} response here", "tone": "warm"}},
  {{"response": "PURE {detected_lang} response here", "tone": "friendly"}},
  {{"response": "PURE {detected_lang} response here", "tone": "enthusiastic"}}
]"""
    
    data = {
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 1000,
        "messages": [{"role": "user", "content": prompt}]
    }
    
    headers = {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
    }
    
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(data).encode(),
        headers=headers,
        method='POST'
    )
    
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode())
        response_text = result['content'][0]['text'].strip()
        response_text = response_text.replace('```json', '').replace('```', '').strip()
        options = json.loads(response_text)
        return options


def call_google_tts(text, language):
    """Call Google Cloud Text-to-Speech API with young female voices"""
    
    # Using Journey/Studio voices for more natural young female sound
    # Wavenet-D voices are female with brighter tone
    # Pitch raised to +3.0 for younger sound

    voice_map = {
        'en-US': {'languageCode': 'en-IN', 'name': 'en-IN-Wavenet-A', 'ssmlGender': 'FEMALE'},
        'hi-IN': {'languageCode': 'hi-IN', 'name': 'hi-IN-Wavenet-A', 'ssmlGender': 'FEMALE'},
        'ta-IN': {'languageCode': 'ta-IN', 'name': 'ta-IN-Wavenet-A', 'ssmlGender': 'FEMALE'},
        'raj-IN': {'languageCode': 'hi-IN', 'name': 'hi-IN-Wavenet-A', 'ssmlGender': 'FEMALE'},
    }
    
    voice_config = voice_map.get(language, voice_map['en-US'])
    
    print(f"[TTS] Language: {language}, Voice: {voice_config['name']}")
    
    data = {
        'input': {'text': text},
        'voice': voice_config,
        'audioConfig': {
            'audioEncoding': 'MP3',
            'pitch': 3.0,          # Higher pitch for younger voice
            'speakingRate': 1.0    # Slightly faster, more youthful
        }
    }
    
    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={GOOGLE_TTS_API_KEY}"
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode())
        audio_content = result['audioContent']
        print(f"[TTS] Successfully generated audio")
        return audio_content


def generate_fallback(patron_text):
    """Generate smart fallback responses"""
    text = patron_text.lower()
    
    if 'type' in text or 'kind' in text or ('what' in text and 'tea' in text):
        return [
            {"response": "We have masala chai, ginger tea, cardamom tea, and regular black tea.", "tone": "formal"},
            {"response": "We've got some delicious masala chai today, or would you prefer ginger tea?", "tone": "warm"},
            {"response": "Our specialty is masala chai, but we also have ginger, cardamom, and plain black tea!", "tone": "friendly"},
            {"response": "Oh, you must try our masala chai - it's amazing! We also have ginger and cardamom varieties.", "tone": "enthusiastic"}
        ]
    
    if 'hello' in text or 'hi' in text or 'hey' in text or 'morning' in text:
        return [
            {"response": "Good morning! Welcome to our tea station. How may I assist you?", "tone": "formal"},
            {"response": "Good morning! So nice to see you. Would you like some chai?", "tone": "warm"},
            {"response": "Hey there! Good morning! Ready for some delicious tea?", "tone": "friendly"},
            {"response": "Good morning! What a beautiful day! Let me get you some amazing chai!", "tone": "enthusiastic"}
        ]
    
    if 'thank' in text:
        return [
            {"response": "You're most welcome. Please enjoy your tea.", "tone": "formal"},
            {"response": "You're very welcome! Enjoy, and let me know if you need anything else.", "tone": "warm"},
            {"response": "My pleasure! Hope you love it!", "tone": "friendly"},
            {"response": "Absolutely! So happy I could help! Enjoy every sip!", "tone": "enthusiastic"}
        ]
    
    return [
        {"response": "I'd be happy to help you. What would you like to know about our tea?", "tone": "formal"},
        {"response": "Sure! What can I tell you about our tea selection?", "tone": "warm"},
        {"response": "Of course! What would you like to know?", "tone": "friendly"},
        {"response": "Absolutely! I'm here to help - what do you need?", "tone": "enthusiastic"}
    ]


# ==================== API ENDPOINTS ====================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Pooja AI API",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check for deployment platforms"""
    return {"status": "ok"}

@app.post("/api/generate")
async def generate_responses(request: GenerateRequest):
    """Generate AI response options"""
    
    lang_map = {
        'en-US': 'English',
        'hi-IN': 'Hindi',
        'ta-IN': 'Tamil',
        'raj-IN': 'Rajasthani'
    }
    forced_language = lang_map.get(request.selectedLanguage, 'English')
    
    try:
        if ANTHROPIC_API_KEY:
            print(f"[API] Calling Claude for: '{request.patronText[:50]}...'")
            print(f"[LANGUAGE] Selected: {request.selectedLanguage} -> {forced_language}")
            options = call_anthropic_api(request.patronText, request.conversationHistory, forced_language)
            return {'success': True, 'options': options, 'usedAPI': True}
        else:
            print(f"[FALLBACK] No API key - using fallback")
            options = generate_fallback(request.patronText)
            return {'success': True, 'options': options, 'fallback': True}
    
    except Exception as e:
        print(f"[ERROR] {type(e).__name__}: {str(e)}")
        options = generate_fallback(request.patronText)
        return {'success': True, 'options': options, 'fallback': True, 'error': str(e)}

@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using Google Cloud TTS"""
    
    if not GOOGLE_TTS_API_KEY:
        return {'success': False, 'error': 'Google TTS API key not configured'}
    
    try:
        audio_base64 = call_google_tts(request.text, request.language)
        return {'success': True, 'audio': audio_base64}
    
    except Exception as e:
        print(f"[TTS ERROR] {type(e).__name__}: {str(e)}")
        return {'success': False, 'error': str(e)}


# ==================== RUN SERVER ====================

if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
