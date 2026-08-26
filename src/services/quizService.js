export const CATEGORIES = [
  { id: 'general', name: 'Genel Kültür', icon: 'mdi-earth' },
  { id: 'tech', name: 'Teknoloji & Yazılım', icon: 'mdi-laptop' },
  { id: 'science', name: 'Bilim & Doğa', icon: 'mdi-flask' },
  { id: 'history', name: 'Tarih', icon: 'mdi-history' },
  { id: 'art', name: 'Sanat & Eser', icon: 'mdi-palette' }
]

export async function fetchQuizQuestions(categoryName) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!apiKey) {
    console.error('API Anahtarı bulunamadı! .env dosyanda VITE_GEMINI_API_KEY tanımlı mı kontrol et.')
    return []
  }

  // Not: gemini-2.5-flash yeni kullanıcılara kapatıldı, güncel model gemini-3.6-flash.
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`

  const prompt = `${categoryName} kategorisinde 10 adet çoktan seçmeli Türkçe quiz sorusu hazırla. 
  Kurallar:
  1. Sorular 1'den 10'a doğru GİTGİDE ZORLAŞAN bir sırada olsun (1. soru çok kolay/başlangıç seviyesi, 10. soru ise alanında uzmanlık gerektiren çok zor bir soru olsun).
  2. Her sorunun tam olarak 5 şıkkı (A, B, C, D, E) bulunsun.
  
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    // response.ok kontrolü olmadan devam etmek hatayı gizliyordu.
    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`Gemini API hatası (${response.status}):`, errorBody)
      return []
    }

    const data = await response.json()

    // Model içeriği güvenlik/uzunluk nedeniyle engellemiş olabilir, bunu da yakalayalım.
    const candidate = data.candidates?.[0]
    if (!candidate) {
      console.error('Gemini API cevabı boş geldi:', data)
      return []
    }

    const textResponse = candidate.content?.parts?.[0]?.text || ''
    const cleanJson = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim()

    if (!cleanJson) {
      console.error('Gemini cevabında JSON bulunamadı. Ham cevap:', textResponse)
      return []
    }

    return JSON.parse(cleanJson)
  } catch (error) {
    console.error('Sorular çekilirken hata oluştu:', error)
    return []
  }
}