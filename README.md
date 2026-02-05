# Pooja AI 🎙️

**Voice Communication Assistant - Giving voice to the voiceless**

A Progressive Web App that helps Pooja, a hotel staff member who cannot speak, communicate with guests using AI-generated responses in multiple languages.

---

## ✨ Features

- 🎤 **Voice Input** - Speak in English, Hindi, Tamil, or Rajasthani
- 🤖 **AI Responses** - Claude AI generates 4 contextual response options
- 🔊 **Natural Voice** - Google Cloud TTS with beautiful female voices
- 📱 **Mobile-First** - Works on any phone/tablet
- 🏨 **Hotel Context** - Trained for tea/chai service hospitality

---

## 🚀 Deployment

### Backend (Render.com)

1. Create account at [render.com](https://render.com)
2. New → Web Service → Connect GitHub repo
3. **Root Directory:** `backend`
4. Add Environment Variables:
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `GOOGLE_TTS_API_KEY` - Your Google Cloud TTS key
   - `CORS_ORIGINS` - Your Vercel frontend URL

### Frontend (Vercel)

1. Create account at [vercel.com](https://vercel.com)
2. Import GitHub repo
3. **Root Directory:** `frontend`
4. Add Environment Variable:
   - `VITE_API_URL` - Your Render backend URL (no trailing slash)

---

## 💰 Costs

| Service | Cost |
|---------|------|
| Render (backend) | Free tier |
| Vercel (frontend) | Free tier |
| Anthropic API | ~$1-5/month |
| Google Cloud TTS | Free tier (90 days $300 credit) |

---

## 🌍 Languages

| Language | Speech Recognition | TTS Voice |
|----------|-------------------|-----------|
| English | ✅ Excellent | ✅ Indian English Female |
| Hindi | ✅ Good | ✅ Hindi Female |
| Tamil | ⚠️ Limited | ✅ Tamil Female |
| Rajasthani | Uses Hindi | Uses Hindi Female |

---

## 📱 Usage

1. Open app on phone/tablet
2. Select language
3. Patron speaks their question
4. AI generates 4 response options
5. Pooja taps her chosen response
6. Phone speaks the response aloud
7. Ready for next patron!

---

Built with ❤️ to give voice to the voiceless.
