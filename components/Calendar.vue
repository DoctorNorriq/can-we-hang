<script setup lang="ts">
import { ref, computed, watch } from "vue";

const props = defineProps<{
  modelValue: string[];
  proposedDates?: string[];
  userHasSelectedDates?: boolean;
  currentMonth?: Date;
}>();

const emit = defineEmits(["update:modelValue", "dateToggled"]);

const currentDate = ref(new Date());
const selectedDates = ref(props.modelValue);

const today = new Date();
today.setHours(0, 0, 0, 0);

const daysInMonth = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  return new Date(year, month + 1, 0).getDate();
});

const firstDayOfMonth = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  let day = new Date(year, month, 1).getDay() - 1;
  return day < 0 ? 6 : day; // Adjust for Monday start (0 = Monday, 6 = Sunday)
});

const days = computed(() => {
  const days = [];
  for (let i = 1; i <= daysInMonth.value; i++) {
    days.push(i);
  }
  return days;
});

const monthName = computed(() => {
  return currentDate.value.toLocaleString("da-DK", { month: "long" });
});

function prevMonth() {
  const newDate = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  );
  currentDate.value = newDate;
}

function nextMonth() {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  );
}

function toggleDate(day: number) {
  const dateToToggle = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth(),
    day,
    12 // Set to noon to avoid timezone issues
  );
  if (dateToToggle < today) return; // Prevent selecting past dates

  const dateString = dateToToggle.toISOString().split("T")[0];
  const index = selectedDates.value.indexOf(dateString);
  if (index > -1) {
    selectedDates.value.splice(index, 1);
  } else {
    selectedDates.value.push(dateString);
  }
  emit("update:modelValue", selectedDates.value);
  emit("dateToggled", dateString);
}

function isSelected(day: number) {
  const dateString = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth(),
    day,
    12 // Set to noon to avoid timezone issues
  )
    .toISOString()
    .split("T")[0];
  return selectedDates.value.includes(dateString);
}

function isProposed(day: number) {
  const dateString = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth(),
    day,
    12 // Set to noon to avoid timezone issues
  )
    .toISOString()
    .split("T")[0];
  return props.proposedDates?.includes(dateString);
}

function isPastDate(day: number) {
  const dateToCheck = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth(),
    day,
    12 // Set to noon to avoid timezone issues
  );
  return dateToCheck < today;
}

const previouslySelectedDates = ref<string[]>([]);
const isAllRemoved = ref(false);

// ... (existing code)

function toggleAllDates() {
  if (!isAllRemoved.value) {
    // If not all removed, remove all dates
    previouslySelectedDates.value = [...selectedDates.value];
    selectedDates.value = [];
    isAllRemoved.value = true;
  } else {
    // If all removed, restore previously selected dates
    selectedDates.value = [...previouslySelectedDates.value];
    isAllRemoved.value = false;
  }
  emit("update:modelValue", selectedDates.value);
}

watch(
  () => props.modelValue,
  (newValue) => {
    const filteredDates = newValue.filter((date) => new Date(date) >= today);
    selectedDates.value = filteredDates;
    if (!isAllRemoved.value) {
      previouslySelectedDates.value = filteredDates;
    }
  },
  { deep: true }
);

watch(
  () => props.modelValue,
  (newValue) => {
    selectedDates.value = newValue.filter((date) => new Date(date) >= today);
  },
  { deep: true }
);

watch(
  () => props.currentMonth,
  (newValue) => {
    if (newValue) {
      currentDate.value = new Date(newValue);
      console.log("New month", newValue);
    }
  }
);

// Initial cleanup of past dates
selectedDates.value = props.modelValue.filter(
  (date) => new Date(date) >= today
);
emit("update:modelValue", selectedDates.value);
</script>

<template>
  <div class="calendar">
    <div class="flex justify-between items-center mb-4">
      <button
        @click="prevMonth"
        class="flex items-center"
        :disabled="currentDate <= today"
      >
        <Icon
          name="material-symbols:arrow-back-2-rounded"
          class="text-[1.5rem] text-white"
          :class="{ 'opacity-25 cursor-not-allowed': currentDate <= today }"
        />
      </button>
      <h3 class="text-white font-bold">
        {{ monthName }} {{ currentDate.getFullYear() }}
      </h3>
      <button @click="nextMonth" class="flex items-center">
        <Icon
          name="material-symbols:play-arrow-rounded"
          class="text-[1.5rem] text-white"
        />
      </button>
    </div>
    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
        :key="day"
        class="text-center text-white font-bold"
      >
        {{ day }}
      </div>
      <div
        v-for="_ in firstDayOfMonth"
        :key="'empty-' + _"
        class="text-center p-2"
      ></div>
      <div
        v-for="day in days"
        :key="day"
        @click="toggleDate(day)"
        class="transition-colors text-center p-2 rounded font-bold"
        :class="[
          isPastDate(day)
            ? 'opacity-25 cursor-not-allowed'
            : 'sm:hover:bg-coffee-bean sm:hover:text-white cursor-pointer',
          isSelected(day)
            ? 'bg-coffee-bean text-white'
            : isProposed(day) && !userHasSelectedDates
            ? 'bg-coffee-latte text-coffee-bean '
            : isProposed(day) && userHasSelectedDates
            ? 'bg-coffee-foam text-coffee-bean'
            : 'bg-white text-coffee-bean',
        ]"
      >
        {{ day }}
      </div>
    </div>
  </div>
</template>
