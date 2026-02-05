/**
 * Pooja AI - Voice Communication Assistant
 * React Frontend for production deployment
 */

import React, { useState, useRef, useEffect } from 'react';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [responseOptions, setResponseOptions] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [status, setStatus] = useState({ message: 'Ready', color: 'gray' });
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const finalTranscriptRef = useRef([]);

  // Initialize speech recognition
  const initializeRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus({ message: '⚠️ Use Chrome/Edge/Safari', color: 'red' });
      return false;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    let recognitionLang = selectedLanguage;
    if (selectedLanguage === 'raj-IN') recognitionLang = 'hi-IN';
    recognition.lang = recognitionLang;

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript('');
      finalTranscriptRef.current = [];
      const langName = { 'en-US': 'English', 'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'raj-IN': 'Rajasthani' }[selectedLanguage];
      setStatus({ message: `🎤 Listening in ${langName}...`, color: 'green' });
    };

    recognition.onresult = (e) => {
      let interimTranscript = '';
      
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        const confidence = e.results[i][0].confidence;
        console.log(`[SPEECH] "${text}" (${(confidence * 100).toFixed(1)}% confidence)`);
        
        if (e.results[i].isFinal) {
          finalTranscriptRef.current.push(text);
        } else {
          interimTranscript += text;
        }
      }
      
      const currentTranscript = finalTranscriptRef.current.join(' ').trim();
      setTranscript((currentTranscript + ' ' + interimTranscript).trim());
    };

    recognition.onend = () => {};
    recognition.onerror = (e) => {
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setStatus({ message: `Error: ${e.error}`, color: 'red' });
      }
    };

    recognitionRef.current = recognition;
    return true;
  };

  const startRecording = () => {
    if (!recognitionRef.current && !initializeRecognition()) return;
    
    // Reinitialize with current language
    initializeRecognition();
    
    try {
      setTranscript('');
      setResponseOptions([]);
      recognitionRef.current.start();
    } catch (e) {
      setStatus({ message: 'Click again', color: 'orange' });
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current || !isRecording) return;
    
    setIsRecording(false);
    recognitionRef.current.stop();
    
    setTimeout(() => {
      const finalText = finalTranscriptRef.current.join(' ').trim();
      if (finalText) {
        generateResponses(finalText);
      } else {
        setStatus({ message: 'No speech detected', color: 'orange' });
      }
    }, 500);
  };

  const handleMicClick = () => {
    if (isSpeaking) {
      setStatus({ message: 'Wait...', color: 'orange' });
      return;
    }
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const generateResponses = async (patronText) => {
    setIsProcessing(true);
    setResponseOptions([]);
    const start = Date.now();

    try {
      const res = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patronText,
          conversationHistory,
          selectedLanguage
        })
      });

      const data = await res.json();
      const time = Date.now() - start;

      if (data.success) {
        setResponseOptions(data.options);
        setStatus({ 
          message: data.fallback ? `✓ Fallback (${time}ms)` : `✓ AI (${time}ms)`, 
          color: data.fallback ? 'orange' : 'green' 
        });
        addToConversation('Patron', patronText);
      } else {
        setStatus({ message: 'Error generating responses', color: 'red' });
      }
    } catch (e) {
      console.error(e);
      setStatus({ message: 'Connection error', color: 'red' });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectResponse = async (option) => {
    setIsSpeaking(true);
    setResponseOptions([]);
    
    await speakText(option.response);
    
    addToConversation(`Pooja (${option.tone})`, option.response);
    setIsSpeaking(false);
    setStatus({ message: '✓ Ready', color: 'blue' });
    setTranscript('');
  };

  const speakText = async (text) => {
    console.log('[TTS] Speaking:', text.substring(0, 50));

    try {
      const res = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: selectedLanguage })
      });

      const data = await res.json();

      if (data.success && data.audio) {
        return new Promise((resolve) => {
          const audio = new Audio('data:audio/mp3;base64,' + data.audio);
          audio.onended = resolve;
          audio.onerror = resolve;
          audio.play();
        });
      } else {
        console.log('[TTS] Falling back to browser');
        return fallbackSpeak(text);
      }
    } catch (e) {
      console.error('[TTS] Error:', e);
      return fallbackSpeak(text);
    }
  };

  const fallbackSpeak = (text) => {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;    // Normal speed
      utterance.pitch = 1.8;   // Higher pitch for young female voice
      
      if (selectedLanguage === 'hi-IN' || selectedLanguage === 'raj-IN') {
        utterance.lang = 'hi-IN';
      } else if (selectedLanguage === 'ta-IN') {
        utterance.lang = 'ta-IN';
      } else {
        utterance.lang = 'en-IN';
      }
      
      // Try to find a female voice
      const voices = synthRef.current.getVoices();
      const femaleVoice = voices.find(v => 
        v.lang.startsWith(utterance.lang.split('-')[0]) && 
        (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))
      );
      if (femaleVoice) utterance.voice = femaleVoice;
      
      utterance.onend = resolve;
      utterance.onerror = resolve;
      synthRef.current.speak(utterance);
    });
  };

  const addToConversation = (role, text) => {
    setConversationHistory(prev => [...prev, { role, text }]);
  };

  const clearHistory = () => {
    setConversationHistory([]);
    setStatus({ message: '✓ Cleared', color: 'green' });
  };

  const statusColors = {
    green: 'text-green-600',
    red: 'text-red-600',
    orange: 'text-orange-600',
    blue: 'text-blue-600',
    gray: 'text-gray-600'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-orange-800 mb-2">🎙️ Pooja AI</h1>
          <p className="text-gray-600">Voice communication assistant</p>
          <div className={`mt-4 text-sm font-semibold ${statusColors[status.color]}`}>
            {status.message}
          </div>
        </div>

        {/* Voice Input */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Voice Input</h2>
          
          {/* Language Selector */}
          <div className="mb-4 flex items-center justify-center gap-4">
            <label className="text-sm font-semibold text-gray-600">Language:</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="en-US">English</option>
              <option value="hi-IN">हिंदी (Hindi)</option>
              <option value="ta-IN">தமிழ் (Tamil)</option>
              <option value="raj-IN">राजस्थानी (Rajasthani)</option>
            </select>
          </div>

          {/* Microphone Button */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleMicClick}
              disabled={isSpeaking}
              className={`w-32 h-32 rounded-full text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center disabled:opacity-50 ${
                isRecording 
                  ? 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse' 
                  : isSpeaking
                  ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                  : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
              }`}
            >
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <div className="text-center">
              {isRecording ? (
                <>
                  <div className="text-lg font-semibold text-red-600">🔴 Recording...</div>
                  <div className="text-sm text-gray-500">Click to STOP</div>
                </>
              ) : isSpeaking ? (
                <div className="text-lg font-semibold text-gray-500">Speaking...</div>
              ) : (
                <>
                  <div className="text-lg font-semibold text-blue-700">Ready</div>
                  <div className="text-sm text-gray-500">Click to START</div>
                </>
              )}
            </div>
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-semibold text-gray-500 mb-2">Patron said:</div>
              <div className="text-gray-800 text-lg">{transcript}</div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="mt-4 text-center text-orange-600">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <div className="mt-2">AI is generating...</div>
            </div>
          )}
        </div>

        {/* Response Options */}
        {responseOptions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Pooja's Response Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {responseOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => selectResponse(option)}
                  className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-2 border-green-200 hover:border-green-400 rounded-lg text-left transition-all transform hover:scale-105 active:scale-95"
                >
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-green-700 mb-1 capitalize">{option.tone}</div>
                      <div className="text-gray-800">{option.response}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex justify-between items-center">
              <span>Conversation</span>
              <button
                onClick={clearHistory}
                className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded"
              >
                Clear
              </button>
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {conversationHistory.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    item.role === 'Patron' ? 'bg-blue-50 ml-8' : 'bg-green-50 mr-8'
                  }`}
                >
                  <div className="text-xs font-semibold text-gray-500 mb-1">{item.role}</div>
                  <div className="text-gray-800">{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Select the language (English/Hindi/Tamil/Rajasthani)</li>
            <li>Click microphone and grant permission</li>
            <li>Speak your question (RED = recording)</li>
            <li>Click again to stop - AI generates responses</li>
            <li>Pooja selects her response</li>
            <li>Response spoken aloud, ready for next question</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;
