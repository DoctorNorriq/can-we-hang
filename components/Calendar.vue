<script setup lang="ts">
const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits(['update:modelValue'])

const currentDate = ref(new Date())
const selectedDates = ref(props.modelValue)

const daysInMonth = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  return new Date(year, month + 1, 0).getDate()
})

const firstDayOfMonth = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  return new Date(year, month, 1).getDay()
})

const days = computed(() => {
  const days = []
  for (let i = 1; i <= daysInMonth.value; i++) {
    days.push(i)
  }
  return days
})

const monthName = computed(() => {
  return currentDate.value.toLocaleString('default', { month: 'long' })
})

function prevMonth() {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

function nextMonth() {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

function toggleDate(day: number) {
  const dateString = `${currentDate.value.getFullYear()}-${String(currentDate.value.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const index = selectedDates.value.indexOf(dateString)
  if (index > -1) {
    selectedDates.value.splice(index, 1)
  } else {
    selectedDates.value.push(dateString)
  }
  emit('update:modelValue', selectedDates.value)
}

function isSelected(day: number) {
  const dateString = `${currentDate.value.getFullYear()}-${String(currentDate.value.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return selectedDates.value.includes(dateString)
}
</script>

<template>
  <div class="calendar">
    <div class="flex justify-between items-center mb-4">
      <button @click="prevMonth" class="text-white">&lt;</button>
      <h3 class="text-white font-bold">{{ monthName }} {{ currentDate.getFullYear() }}</h3>
      <button @click="nextMonth" class="text-white">&gt;</button>
    </div>
    <div class="grid grid-cols-7 gap-1">
      <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="text-center text-white font-bold">
        {{ day }}
      </div>
      <div v-for="_ in firstDayOfMonth" :key="'empty-' + _" class="text-center p-2"></div>
      <div
        v-for="day in days"
        :key="day"
        @click="toggleDate(day)"
        :class="['text-center p-2 cursor-pointer rounded', isSelected(day) ? 'bg-blue-600 text-white' : 'bg-white text-blue-600']"
      >
        {{ day }}
      </div>
    </div>
  </div>
</template>