import { FALLBACK_QUESTIONS } from '@/fallbackQuestions'

// Test modu: true iken API başarısız olsa bile fallback'e düşmez, hatayı direkt gösterir.
// Testin bitince sadece bu satırı false yap, başka hiçbir şeyi değiştirmene gerek yok.
const DEBUG_NO_FALLBACK = true

export const CATEGORIES = [
  { id: 'general', name: 'Genel Kültür', icon: 'mdi-earth' },
  { id: 'tech', name: 'Teknoloji & Yazılım', icon: 'mdi-laptop' },
  { id: 'science', name: 'Bilim & Doğa', icon: 'mdi-flask' },
  { id: 'history', name: 'Tarih', icon: 'mdi-history' },
  { id: 'art', name: 'Sanat & Eser', icon: 'mdi-palette' }
]

export async function fetchQuizQuestions(categoryName) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY

  const fallbackData = FALLBACK_QUESTIONS[categoryName] || []


  const useFallback = (reason) => {
    if (DEBUG_NO_FALLBACK) {
      throw new Error(`[DEBUG] Fallback tetiklendi ama DEBUG_NO_FALLBACK açık: ${reason}`)
    }
    console.warn(reason)
    return fallbackData
  }

  if (!apiKey) {
    return useFallback('API Anahtarı bulunamadı! Sabit soru kütüphanesi yükleniyor.')
  }

  const endpoint = 'https://api.groq.com/openai/v1/chat/completions'

  // Her istekte farklı bir rastgele tohum (seed) ekleyerek modelin hep aynı
  // "en klasik" soruları üretmesinin önüne geçiyoruz.
  const randomSeed = Math.floor(Math.random() * 1000000)

  const prompt = `${categoryName} kategorisinde 10 adet çoktan seçmeli Türkçe quiz sorusu hazırla. 
  Kurallar:
  1. Sorular 1'den 10'a doğru GİTGİDE ZORLAŞAN bir sırada olsun (1. soru çok kolay/başlangıç seviyesi, 10. soru ise alanında uzmanlık gerektiren çok zor bir soru olsun).
  2. Her sorunun tam olarak 5 şıkkı (A, B, C, D, E) bulunsun.
  3. En çok bilinen, en klişe soruları (örneğin "Türkiye'nin başkenti neresidir?" gibi) KULLANMA. Daha az sorulan ama yine de bilinebilir, ilginç ve çeşitli konular seç.
  4. Bu bir tekrar isteğidir (istek kodu: ${randomSeed}), önceki isteklerden tamamen farklı sorular üret; aynı konuları, aynı kalıpları tekrarlama.
  
  Yanıtı SADECE şu JSON dizisi formatında ver, başka hiçbir metin veya markdown ekleme:
  [
    {
      "id": 1,
      "question": "Soru metni buraya",
      "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı", "E şıkkı"],
      "correctIndex": 0
    }
  ]`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content: 'Sen bir bilgi yarışması sorusu üreticisisin. Sadece istenen JSON formatında yanıt ver, başka hiçbir açıklama veya markdown ekleme.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 1.1
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return useFallback(`Groq API hatası (${response.status}): ${errorBody}`)
    }

    const data = await response.json()

    const message = data.choices?.[0]?.message
    if (!message) {
      return useFallback(`Groq API cevabı boş geldi: ${JSON.stringify(data)}`)
    }

    const textResponse = message.content || ''
    const cleanJson = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim()

    if (!cleanJson) {
      return useFallback(`Groq cevabında JSON bulunamadı. Ham cevap: ${textResponse}`)
    }

    const parsed = JSON.parse(cleanJson)

/
    if (Array.isArray(parsed)) return parsed
    if (parsed.questions) return parsed.questions
    return useFallback('Groq cevabı beklenen formatta değil (array veya questions alanı yok).')
  } catch (error) {
    if (DEBUG_NO_FALLBACK) throw error
    console.error('Sorular çekilirken hata oluştu:', error)
    return fallbackData
  }
}