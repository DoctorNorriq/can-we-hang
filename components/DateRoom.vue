<script setup lang="ts">
import Calendar from "./Calendar.vue";

const props = defineProps<{
  date: {
    id: string;
    name: string;
    code: string;
  } | null;
}>();

const emit = defineEmits(["leaveDate", "updateUserData"]);

const supabase = useSupabaseClient();
const userStore = useUserStore();
const selectedDates = ref<string[]>([]);
const localSelectedDates = ref<string[]>([]);
const allSelectedDates = ref<{ user_name: string; available_days: string[] }[]>(
  []
);

const allSelectedDatesWithCount = computed(() => {
  const dateCount = new Map();
  allSelectedDates.value.forEach((user) => {
    user.available_days.forEach((date) => {
      dateCount.set(date, (dateCount.get(date) || 0) + 1);
    });
  });
  return Array.from(dateCount.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
});

const showCalendar = ref(false);
const commonDates = ref<string[]>([]);
let subscription: any = null;

const isDateLoaded = computed(
  () => props.date && props.date.id && props.date.name && props.date.code
);

const allUsers = computed(() =>
  allSelectedDates.value.map((user) => user.user_name)
);

const userCount = computed(() => allSelectedDates.value.length);

const usersChosen = computed(() =>
  allSelectedDates.value
    .filter((user) => user.available_days.length > 0)
    .map((user) => user.user_name)
);

const usersNotChosen = computed(() =>
  allSelectedDates.value
    .filter((user) => user.available_days.length === 0)
    .map((user) => user.user_name)
);

const availableDates = computed(() => {
  // If not all users have chosen dates, return an empty array
  if (usersChosen.value.length !== userCount.value) {
    return [];
  }
  // If there are at least two users and all have chosen dates
  if (usersChosen.value.length >= 2) {
    return allSelectedDatesWithCount.value
      .filter((date) => date.count === userCount.value)
      .map((date) => date.date);
  }
  // If there's only one user who has chosen dates
  return allSelectedDatesWithCount.value.map((date) => date.date);
});

const otherSelectedDates = computed(() => {
  // If no users have chosen dates, return an empty array
  if (usersChosen.value.length === 0) {
    return [];
  }
  // If not all users have chosen dates, show all selected dates
  if (usersChosen.value.length < userCount.value) {
    return allSelectedDatesWithCount.value;
  }
  // If all users have chosen dates, show dates that are not common to all
  return allSelectedDatesWithCount.value.filter(
    (date) => date.count < userCount.value && date.count > 0
  );
});

async function fetchAllSelectedDates() {
  if (!isDateLoaded.value) return;
  try {
    const { data, error } = await supabase
      .from("availability")
      .select("user_name, available_days")
      .eq("date_id", props.date!.id)
      .eq("is_active", true);
    if (error) throw error;
    allSelectedDates.value = data || [];
    if (
      !allSelectedDates.value.some((user) => user.user_name === userStore.name)
    ) {
      allSelectedDates.value.push({
        user_name: userStore.name,
        available_days: [],
      });
    }
    calculateCommonDates();
    const userDates = allSelectedDates.value.find(
      (user) => user.user_name === userStore.name
    );
    if (userDates) {
      selectedDates.value = userDates.available_days;
      localSelectedDates.value = [...userDates.available_days];
    } else {
      selectedDates.value = [];
      localSelectedDates.value = [];
    }
    emit("updateUserData", {
      userCount: userCount.value,
      usersChosen: usersChosen.value,
      usersNotChosen: usersNotChosen.value,
    });
  } catch (error) {
    console.error("Error fetching dates:", error);
    console.log(
      `Error fetching dates: ${(error as Error).message}. Please try again.`
    );
  }
}

function calculateCommonDates() {
  const nonEmptyDateArrays = allSelectedDates.value
    .map((user) => user.available_days)
    .filter((days) => days.length > 0);
  if (nonEmptyDateArrays.length < 2) {
    commonDates.value = [];
    return;
  }
  commonDates.value = nonEmptyDateArrays.reduce((a, b) =>
    a.filter((date) => b.includes(date))
  );
}

async function saveDates() {
  if (!isDateLoaded.value) {
    console.log("Date data not fully loaded. Please try again.");
    return;
  }
  try {
    const { error } = await supabase.from("availability").upsert(
      {
        date_id: props.date!.id,
        user_name: userStore.name,
        available_days: localSelectedDates.value,
      },
      {
        onConflict: "date_id,user_name",
        returning: "minimal",
      }
    );
    if (error) throw error;
    selectedDates.value = [...localSelectedDates.value];
    await fetchAllSelectedDates();
    showCalendar.value = false;
    console.log("Dates saved successfully!");
  } catch (error) {
    console.error("Error saving dates:", error);
    console.log(
      `Error saving dates: ${(error as Error).message}. Please try again.`
    );
  }
}

const leaveDateConfirm = ref(false);
const showOtherButtons = ref(false);

function leaveDate() {
  if (!leaveDateConfirm.value) {
    leaveDateConfirm.value = true;
    showOtherButtons.value = true;
    return;
  }
  emit("leaveDate");
}

async function abandonDate() {
  if (!isDateLoaded.value) return;
  try {
    console.log("Abandoning date...");
    const { error } = await supabase
      .from("availability")
      .update({ is_active: false, available_days: [] })
      .match({ date_id: props.date!.id, user_name: userStore.name });
    if (error) throw error;
    console.log("Date abandoned successfully");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Emitting leaveDate event");
    emit("leaveDate");
  } catch (error) {
    console.error("Error abandoning date:", error);
    console.log(
      `Error abandoning date: ${(error as Error).message}. Please try again.`
    );
  }
}

const hideButtons = () => {
  showOtherButtons.value = false;
  leaveDateConfirm.value = false;
};

const userHasSelectedDates = computed(() => {
  const userDates = allSelectedDates.value.find(
    (user) => user.user_name === userStore.name
  );
  return userDates && userDates.available_days.length > 0;
});

function toggleCalendar() {
  showCalendar.value = !showCalendar.value;
}

function copyDateCode() {
  if (props.date && props.date.code) {
    navigator.clipboard
      .writeText(props.date.code)
      .then(() => {
        console.log("Date code copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        console.log("Failed to copy date code. Please try again.");
      });
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOfWeek = days[date.getDay()];

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const year = date.getFullYear();

  return `${day}-${month}-${year} (${dayOfWeek})`;
}

onMounted(async () => {
  if (isDateLoaded.value) {
    await fetchAllSelectedDates();
    const channel = supabase.channel(`date_${props.date!.id}`);
    subscription = channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "availability",
          filter: `date_id=eq.${props.date!.id}`,
        },
        (payload) => {
          console.log("Change received!", payload);
          fetchAllSelectedDates().then(() => {
            console.log(
              "Updated allSelectedDates after fetch:",
              allSelectedDates.value
            );
          });
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });
    console.log("Subscription set up:", subscription);
  }
});

onUnmounted(() => {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
});

watch(isDateLoaded, (newValue) => {
  if (newValue) {
    fetchAllSelectedDates();
  }
});
</script>

<template>
  <div class="h-full sm:overflow-y-auto custom-scrollbar">
    <div
      v-if="isDateLoaded"
      class="flex flex-col bg-coffee-foam items-center justify-center gap-4 p-4 w-full min-h-full"
    >
      <div class="flex flex-col items-center w-full max-w-[450px]">
        <h1
          class="text-[3rem] font-bold text-coffee-mocha text-center break-words w-full"
        >
          {{ date!.name }}?
        </h1>
        <div class="flex items-center mt-2">
          <Icon name="tabler:hash" class="text-blue-600 text-[1.25rem]" />
          <span
            class="text-blue-600 font-bold cursor-pointer"
            @click="copyDateCode"
            title="Click to copy date code"
          >
            {{ date!.code }}
          </span>
        </div>
      </div>

      <div
        class="flex flex-col gap-4 bg-coffee-latte w-full max-w-[450px] p-6 rounded shadow-md"
      >
        <div>
          <h3 class="font-bold text-coffee-mocha">
            {{
              usersChosen.length > 1
                ? "Possible dates in common"
                : "Possible dates"
            }}
          </h3>
          <template v-if="usersChosen.length > 0">
            <p v-if="usersChosen.length === 1" class="text-coffee-mocha mb-4">
              These are only the dates proposed by the first user. Possible
              dates
              <span class="text-coffee-mocha font-bold">in common</span> will be
              shown, when more users enter their availability.
            </p>
            <ul v-if="availableDates.length > 0 && usersChosen.length > 1">
              <li
                v-for="date in availableDates"
                :key="date"
                class="flex items-center text-coffee-mocha font-bold"
              >
                {{ formatDate(date) }}
                <Icon
                  v-if="selectedDates.includes(date)"
                  name="material-symbols:star-rounded"
                  class="text-coffee-mocha"
                  title="You have selected this date"
                />
              </li>
            </ul>
            <ul v-if="usersChosen.length === 1">
              <li
                v-for="date in allSelectedDatesWithCount"
                :key="date.date"
                class="flex items-center text-coffee-mocha font-bold"
              >
                {{ formatDate(date.date) }}
                <Icon
                  v-if="selectedDates.includes(date.date)"
                  name="material-symbols:star-rounded"
                  class="text-coffee-mocha"
                  title="You have selected this date"
                />
              </li>
            </ul>
            <p
              v-if="availableDates.length === 0 && usersChosen.length > 1"
              class="text-coffee-mocha"
            >
              No dates in common. Try harder!
            </p>
          </template>
          <p v-else class="text-coffee-mocha">
            No dates have been proposed yet.
          </p>
        </div>
        <div v-if="otherSelectedDates.length > 0 && usersChosen.length > 1">
          <h3 class="font-bold text-coffee-mocha">Other proposed dates</h3>
          <ul>
            <li
              v-for="date in otherSelectedDates"
              :key="date.date"
              class="flex items-center text-coffee-mocha font-bold opacity-50"
            >
              {{ formatDate(date.date) }} ({{ date.count }}/{{ userCount }})
              <Icon
                v-if="selectedDates.includes(date.date)"
                name="material-symbols:star-rounded"
                class="text-coffee-mocha"
                title="You have selected this date"
              />
            </li>
          </ul>
        </div>
      </div>
      <div
        class="flex flex-col gap-4 w-full max-w-[450px] bg-coffee-mocha p-6 rounded shadow-md"
      >
        <div>
          <h3 class="text-2xl font-bold text-coffee-foam">Select dates</h3>
          <p v-if="userHasSelectedDates" class="text-coffee-foam">
            You have proposed some dates - good job!
          </p>
          <p v-else class="text-coffee-foam">
            You haven't yet proposed any dates. Press the calender to get
            started!
          </p>
        </div>
        <button
          @click="toggleCalendar"
          class="py-3 px-6 font-bold rounded transition-colors sm:hover:bg-coffee-bean sm:hover:text-coffee-foam w-full"
          :class="
            showCalendar
              ? 'bg-coffee-cappuccino text-coffee-foam'
              : 'bg-coffee-foam text-coffee-mocha'
          "
        >
          {{ showCalendar ? "Hide Calendar" : "Show Calendar" }}
        </button>
        <Calendar v-if="showCalendar" v-model="localSelectedDates" />
        <button
          v-if="showCalendar"
          @click="saveDates"
          class="bg-coffee-foam py-3 px-6 text-coffee-mocha font-bold rounded transition-colors sm:hover:bg-coffee-bean sm:hover:text-coffee-foam w-full"
        >
          Save Dates
        </button>
      </div>
      <div class="w-full max-w-[450px] flex flex-col gap-2">
        <button
          @click="leaveDate"
          class="w-full bg-coffee-latte py-3 px-6 text-coffee-foam font-bold rounded transition-colors sm:hover:bg-coffee-mocha"
          :class="!leaveDateConfirm ? 'bg-coffee-latte' : 'bg-coffee-mocha'"
        >
          {{ leaveDateConfirm ? "Confirm" : "Leave date room" }}
        </button>
        <button
          v-if="showOtherButtons"
          @click="hideButtons"
          class="w-full bg-coffee-latte py-3 px-6 text-coffee-mocha font-bold rounded transition-colors sm:hover:border-coffee-mocha border-2"
        >
          Cancel
        </button>
        <span
          v-if="showOtherButtons"
          class="text-coffee-mocha font-bold text-center"
          >or</span
        >
        <button
          v-if="showOtherButtons"
          @click="abandonDate"
          class="w-full bg-red-400 py-3 px-6 text-coffee-foam font-bold rounded transition-colors sm:hover:bg-red-600"
        >
          Abandon date
        </button>
      </div>
    </div>
    <div v-else class="text-center text-xl font-bold text-coffee-mocha">
      Loading room data...
    </div>
  </div>
</template>
