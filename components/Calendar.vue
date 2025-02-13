<script setup lang="ts">
const props = defineProps<{
  modelValue: string[];
  proposedDates?: string[];
}>();

const emit = defineEmits(["update:modelValue"]);
const currentDate = ref(new Date());
const selectedDates = ref(props.modelValue);

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
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  );
}

function nextMonth() {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  );
}

function toggleDate(day: number) {
  const dateString = `${currentDate.value.getFullYear()}-${String(
    currentDate.value.getMonth() + 1
  ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const index = selectedDates.value.indexOf(dateString);
  if (index > -1) {
    selectedDates.value.splice(index, 1);
  } else {
    selectedDates.value.push(dateString);
  }
  emit("update:modelValue", selectedDates.value);
}

function isSelected(day: number) {
  const dateString = `${currentDate.value.getFullYear()}-${String(
    currentDate.value.getMonth() + 1
  ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return selectedDates.value.includes(dateString);
}

function isProposed(day: number) {
  const dateString = `${currentDate.value.getFullYear()}-${String(
    currentDate.value.getMonth() + 1
  ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return props.proposedDates?.includes(dateString);
}
</script>

<template>
  <div class="calendar">
    <div class="flex justify-between items-center mb-4">
      <button @click="prevMonth" class="text-white flex items-center">
        <Icon
          name="material-symbols:arrow-back-2-rounded"
          class="text-[1.5rem]"
        />
      </button>
      <h3 class="text-white font-bold">
        {{ monthName }} {{ currentDate.getFullYear() }}
      </h3>
      <button @click="nextMonth" class="text-white flex items-center">
        <Icon
          name="material-symbols:play-arrow-rounded"
          class="text-[1.5rem]"
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
        :class="[
          'transition-colors text-center p-2 cursor-pointer rounded font-bold',
          isSelected(day)
            ? 'bg-coffee-bean text-white'
            : isProposed(day)
            ? 'bg-coffee-latte text-coffee-bean sm:hover:bg-coffee-bean sm:hover:text-white'
            : 'bg-white text-coffee-bean sm:hover:bg-coffee-bean sm:hover:text-white',
        ]"
      >
        {{ day }}
      </div>
    </div>
  </div>
</template>
