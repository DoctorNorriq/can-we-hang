<script setup lang="ts">
import Calendar from "./Calendar.vue";

const props = defineProps<{
  room: {
    id: string;
    name: string;
    code: string;
  } | null;
}>();

const emit = defineEmits(["leaveRoom"]);

const supabase = useSupabaseClient();
const userStore = useUserStore();
const selectedDates = ref<string[]>([]);
const allSelectedDates = ref<{ user_name: string; available_days: string[] }[]>(
  []
);
const showCalendar = ref(false);
const commonDates = ref<string[]>([]);

const isRoomLoaded = computed(
  () => props.room && props.room.id && props.room.name && props.room.code
);

const userCount = computed(() => allSelectedDates.value.length);

const userNames = computed(() =>
  allSelectedDates.value.map((user) => user.user_name).join(", ")
);

const availableDates = computed(() => {
  if (userCount.value === 0) return [];
  if (userCount.value === 1) return allSelectedDates.value[0].available_days;
  return commonDates.value;
});

async function fetchAllSelectedDates() {
  if (!isRoomLoaded.value) return;

  try {
    const { data, error } = await supabase
      .from("availability")
      .select("user_name, available_days")
      .eq("date_id", props.room!.id);

    if (error) throw error;

    allSelectedDates.value = data || [];
    calculateCommonDates();

    // Load user's previously selected dates
    const userDates = allSelectedDates.value.find(
      (user) => user.user_name === userStore.name
    );
    if (userDates) {
      selectedDates.value = userDates.available_days;
    }
  } catch (error) {
    console.error("Error fetching dates:", error);
    alert(
      `Error fetching dates: ${(error as Error).message}. Please try again.`
    );
  }
}

function calculateCommonDates() {
  if (allSelectedDates.value.length < 2) {
    commonDates.value = [];
    return;
  }

  const dateArrays = allSelectedDates.value.map((user) => user.available_days);
  commonDates.value = dateArrays.reduce((a, b) =>
    a.filter((date) => b.includes(date))
  );
}

async function saveDates() {
  if (!isRoomLoaded.value) {
    alert("Room data not fully loaded. Please try again.");
    return;
  }

  try {
    const { error } = await supabase.from("availability").upsert(
      {
        date_id: props.room!.id,
        user_name: userStore.name,
        available_days: selectedDates.value,
      },
      {
        onConflict: "date_id,user_name",
        returning: "minimal",
      }
    );

    if (error) throw error;

    alert("Dates saved successfully!");
    await fetchAllSelectedDates();
  } catch (error) {
    console.error("Error saving dates:", error);
    alert(`Error saving dates: ${(error as Error).message}. Please try again.`);
  }
}

function leaveRoom() {
  emit("leaveRoom");
}

function toggleCalendar() {
  showCalendar.value = !showCalendar.value;
}

onMounted(() => {
  if (isRoomLoaded.value) {
    fetchAllSelectedDates();
  }
});

watch(isRoomLoaded, (newValue) => {
  if (newValue) {
    fetchAllSelectedDates();
  }
});
</script>

<template>
  <div v-if="isRoomLoaded" class="flex flex-col gap-4 max-w-md mx-auto">
    <h1 class="text-3xl font-bold text-blue-800">{{ room!.name }}</h1>
    <p class="text-green-700">Room Code: {{ room!.code }}</p>
    <p class="text-blue-600">Welcome, {{ userStore.name }}</p>

    <div class="bg-orange-400 p-6 rounded shadow-md">
      <h2 class="text-2xl font-bold text-white mb-4">Select Available Dates</h2>
      <button
        @click="toggleCalendar"
        class="bg-blue-600 py-2 px-4 text-white font-bold rounded transition-colors hover:bg-blue-700 w-full mb-4"
      >
        {{ showCalendar ? "Hide Calendar" : "Show Calendar" }}
      </button>
      <Calendar v-if="showCalendar" v-model="selectedDates" />
      <button
        v-if="showCalendar"
        @click="saveDates"
        class="bg-blue-600 py-2 px-4 text-white font-bold rounded transition-colors hover:bg-blue-700 w-full mt-4"
      >
        Save Dates
      </button>
    </div>

    <div class="bg-green-400 p-6 rounded shadow-md">
      <h2 class="text-2xl font-bold text-white mb-4">
        {{ userCount > 1 ? "Common Available Dates" : "Available Dates" }}
      </h2>
      <p class="text-white mb-2">
        {{ userCount }} user{{ userCount !== 1 ? "s" : "" }} have entered dates:
        <span class="font-bold">{{ userNames }}</span>
      </p>
      <template v-if="userCount > 0">
        <ul v-if="availableDates.length > 0">
          <li v-for="date in availableDates" :key="date" class="text-white">
            {{ new Date(date).toLocaleDateString() }}
          </li>
        </ul>
        <p v-else class="text-white">No common dates found.</p>
      </template>
      <p v-else class="text-white">No dates have been entered yet.</p>
      <p v-if="userCount === 1" class="text-white mt-2">
        These are the dates selected by the first user. Common dates will be
        shown when more users enter their availability.
      </p>
    </div>

    <button
      @click="leaveRoom"
      class="bg-red-500 py-2 px-4 text-white font-bold rounded transition-colors hover:bg-red-600"
    >
      Leave Room
    </button>
  </div>
  <div v-else class="text-center text-xl font-bold text-blue-800">
    Loading room data...
  </div>
</template>
