<template>
  <v-app>
    <v-app-bar color="black" flat>
      <v-app-bar-title class="text-yellow-darken-2 font-weight-bold">Quiz App</v-app-bar-title>
    </v-app-bar>

    <v-main>
      <v-container class="py-8" style="max-width: 700px;">

        <!-- Kategori seçimi -->
        <div v-if="gameState === 'SELECT'">
          <h2 class="text-h5 mb-1">Bir kategori seç</h2>
          <p class="text-body-2 text-medium-emphasis mb-6">
            Her kategoride 10 soru var, tüm test için 1 dakikan olacak.
          </p>

          <v-row>
            <v-col
              v-for="cat in categories"
              :key="cat.id"
              cols="12"
              sm="6"
            >
              <v-card variant="outlined" color="black" @click="startQuiz(cat.name)">
                <v-card-item>
                  <template #prepend>
                    <v-icon :icon="cat.icon" color="black" size="32"></v-icon>
                  </template>
                  <v-card-title>{{ cat.name }}</v-card-title>
                </v-card-item>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="yellow-darken-2" variant="flat" class="text-black" @click="startQuiz(cat.name)">
                    Başla
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Yükleniyor -->
        <div v-else-if="loading" class="text-center py-16">
          <v-progress-circular indeterminate color="yellow-darken-2" size="48"></v-progress-circular>
          <p class="text-body-2 text-medium-emphasis mt-4">Sorular yükleniyor...</p>
        </div>

        <!-- Soru ekranı -->
        <v-card v-else-if="gameState === 'QUIZ'" variant="outlined" color="black">
          <v-card-item>
            <div class="d-flex align-center justify-space-between mb-2">
              <v-chip color="black" variant="flat">{{ currentIndex + 1 }} / 10</v-chip>
              <v-chip :color="timerColor" variant="flat">{{ formattedTime }}</v-chip>
              <v-chip color="yellow-darken-2" variant="flat" class="text-black">{{ score }} puan</v-chip>
            </div>
            <v-progress-linear
              :model-value="(timeLeft / TOTAL_TIME) * 100"
              :color="timerColor"
              height="6"
              rounded
            ></v-progress-linear>
          </v-card-item>

          <v-divider></v-divider>

          <v-card-text>
            <p class="text-h6 mb-4">{{ currentQuestion.question }}</p>

            <v-list lines="one">
              <v-list-item
                v-for="(option, idx) in currentQuestion.options"
                :key="idx"
                :disabled="selectedOption !== null"
                :base-color="optionColor(idx)"
                :variant="optionColor(idx) ? 'tonal' : 'outlined'"
                class="mb-2"
                rounded="lg"
                border
                @click="handleAnswer(idx)"
              >
                <template #prepend>
                  <span class="font-weight-bold mr-3">{{ ['A', 'B', 'C', 'D', 'E'][idx] }}</span>
                </template>
                <v-list-item-title>{{ option }}</v-list-item-title>
                <template #append v-if="selectedOption !== null">
                  <v-icon v-if="idx === currentQuestion.correctIndex" color="success" icon="mdi-check"></v-icon>
                  <v-icon v-else-if="idx === selectedOption" color="error" icon="mdi-close"></v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>

          <v-card-actions v-if="selectedOption !== null">
            <v-spacer></v-spacer>
            <v-btn color="yellow-darken-2" variant="flat" class="text-black" @click="nextQuestion">
              {{ currentIndex < 9 ? 'Sonraki soru' : 'Bitir' }}
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- Sonuç -->
        <v-card v-else-if="gameState === 'RESULT'" variant="outlined" color="black" class="text-center pa-6">
          <v-icon icon="mdi-trophy" color="yellow-darken-2" size="56" class="mb-2"></v-icon>
          <v-card-title class="text-h5">Quiz bitti!</v-card-title>
          <v-card-text>
            <p class="text-h4 font-weight-bold">{{ score }} / 100</p>
          </v-card-text>
          <v-card-actions class="justify-center">
            <v-btn color="yellow-darken-2" variant="flat" class="text-black" @click="resetGame">Tekrar oyna</v-btn>
          </v-card-actions>
        </v-card>

      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { CATEGORIES, fetchQuizQuestions } from './services/quizService'

const categories = CATEGORIES
const gameState = ref('SELECT')
const loading = ref(false)
const questions = ref([])
const currentIndex = ref(0)
const selectedOption = ref(null)
const score = ref(0)

const TOTAL_TIME = 60 // tüm test (10 soru) için toplam süre: 1 dakika
const timeLeft = ref(TOTAL_TIME)
let timer = null

const formattedTime = computed(() => {
  const m = Math.floor(timeLeft.value / 60)
  const s = timeLeft.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

// Süre azaldıkça yeşilden turuncuya döner son 15 saniye tamamen kırmızı olur
function mixColor(from, to, t) {
  const r = Math.round(from[0] + (to[0] - from[0]) * t)
  const g = Math.round(from[1] + (to[1] - from[1]) * t)
  const b = Math.round(from[2] + (to[2] - from[2]) * t)
  return `rgb(${r}, ${g}, ${b})`
}

const RED_THRESHOLD = 15 // son 15 saniye

const timerColor = computed(() => {
  const green = [76, 175, 80]
  const orange = [255, 152, 0]

  if (timeLeft.value <= RED_THRESHOLD) {
    return 'error'
  }

  const t = (TOTAL_TIME - timeLeft.value) / (TOTAL_TIME - RED_THRESHOLD)
  return mixColor(green, orange, t)
})

const currentQuestion = computed(() => questions.value[currentIndex.value] || {})

function startTimer() {
  clearInterval(timer)
  timeLeft.value = TOTAL_TIME
  timer = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      clearInterval(timer)
      gameState.value = 'RESULT'
    }
  }, 1000)
}

async function startQuiz(catName) {
  loading.value = true
  gameState.value = 'QUIZ'
  questions.value = await fetchQuizQuestions(catName)
  currentIndex.value = 0
  score.value = 0
  selectedOption.value = null
  loading.value = false
  startTimer()
}

function handleAnswer(index) {
  if (selectedOption.value !== null) return
  selectedOption.value = index
  if (index === currentQuestion.value.correctIndex) {
    score.value += 10
  }
}

function optionColor(index) {
  if (selectedOption.value === null) return null
  if (index === currentQuestion.value.correctIndex) return 'success'
  if (index === selectedOption.value) return 'error'
  return null
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++
    selectedOption.value = null
  } else {
    clearInterval(timer)
    gameState.value = 'RESULT'
  }
}

function resetGame() {
  clearInterval(timer)
  gameState.value = 'SELECT'
}

onUnmounted(() => {
  clearInterval(timer)
})
</script>