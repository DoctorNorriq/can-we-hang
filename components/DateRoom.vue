<script setup lang="ts">
import Calendar from "./Calendar.vue";

const props = defineProps<{
  date: {
    id: string;
    name: string;
    code: string;
  } | null;
  userName: string;
  hoveredUser: string | null;
}>();

const emit = defineEmits(["leaveDate", "updateUserData"]);

const supabase = useSupabaseClient();
const userStore = useUserStore();

const currentCalendarMonth = ref(new Date());
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
    .sort((a, b) => a.localeCompare(b))
);

const usersNotChosen = computed(() =>
  allSelectedDates.value
    .filter((user) => user.available_days.length === 0)
    .map((user) => user.user_name)
    .sort((a, b) => a.localeCompare(b))
);

const availableDates = computed(() => {
  // If there are exactly 2 users and only one has chosen dates
  if (userCount.value === 2 && usersChosen.value.length === 1) {
    const chosenUser = allSelectedDates.value.find(
      (user) => user.available_days.length > 0
    );
    return chosenUser ? chosenUser.available_days : [];
  }

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

const allProposedDates = computed(() => {
  return allSelectedDatesWithCount.value.map((item) => item.date);
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
    if (localSelectedDates.value.length > 0) {
      currentCalendarMonth.value = new Date(localSelectedDates.value[0]);
    }
    showCalendar.value = false;
    previouslySelectedDates.value = [];
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

const buttonContainerRef = ref<HTMLElement | null>(null);

const hideButtons = () => {
  showOtherButtons.value = false;
  leaveDateConfirm.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  if (
    buttonContainerRef.value &&
    !buttonContainerRef.value.contains(event.target as Node)
  ) {
    hideButtons();
  }
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
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayOfWeek = days[date.getDay()];

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const year = date.getFullYear();

  return `${day}-${month}-${year} (${dayOfWeek})`;
}

function handleProposedDate(date: string) {
  const index = localSelectedDates.value.indexOf(date);
  if (index === -1) {
    localSelectedDates.value.push(date);
  } else {
    localSelectedDates.value.splice(index, 1);
  }

  currentCalendarMonth.value = new Date(date);
  console.log(currentCalendarMonth.value, "currentCalendarMonth");

  if (!showCalendar.value) {
    showCalendar.value = true;
  }
}

const highestDateCount = computed(() => {
  return Math.max(...otherSelectedDates.value.map((date) => date.count));
});

const userProposedDatesCount = computed(() => {
  const userDates = allSelectedDates.value.find(
    (user) => user.user_name === userStore.name
  );
  return userDates ? userDates.available_days.length : 0;
});

const hoveredUserDates = computed(() => {
  if (!props.hoveredUser) return [];
  const userDates = allSelectedDates.value.find(
    (user) => user.user_name === props.hoveredUser
  );
  return userDates ? userDates.available_days : [];
});

const buttonClasses = computed(() => {
  if (userHasSelectedDates.value) {
    return showCalendar.value
      ? "bg-coffee-foam text-coffee-mocha"
      : "bg-coffee-mocha text-coffee-foam";
  } else {
    return showCalendar.value
      ? "bg-coffee-cappuccino text-white"
      : "bg-coffee-foam text-coffee-mocha";
  }
});

const groupedDates = computed(() => {
  const groups: { [key: string]: string[] } = {};
  availableDates.value.forEach((date) => {
    const monthYear = new Date(date).toLocaleString("en-GB", {
      month: "long",
      year: "numeric",
    });
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(date);
  });
  return groups;
});

const groupedOtherDates = computed(() => {
  const groups: { [key: string]: typeof otherSelectedDates.value } = {};
  otherSelectedDates.value.forEach((date) => {
    const monthYear = new Date(date.date).toLocaleString("en-GB", {
      month: "long",
      year: "numeric",
    });
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(date);
  });
  return groups;
});

const previouslySelectedDates = ref<string[]>([]);
const isAllRemoved = ref(false);

function toggleAllDates() {
  if (!isAllRemoved.value) {
    previouslySelectedDates.value = [...localSelectedDates.value];
    localSelectedDates.value = [];
    isAllRemoved.value = true;
  } else {
    localSelectedDates.value = [...previouslySelectedDates.value];
    isAllRemoved.value = false;
  }
}

function handleDateToggled(date: string) {
  if (isAllRemoved.value) {
    previouslySelectedDates.value = [];
    isAllRemoved.value = false;
  }
}

onMounted(async () => {
  document.addEventListener("click", handleClickOutside);
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
  document.removeEventListener("click", handleClickOutside);
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
      class="flex flex-col bg-coffee-foam items-center justify-center gap-8 sm:gap-4 p-4 w-full min-h-full"
    >
      <div class="flex flex-col items-center w-full">
        <h1
          class="text-[clamp(2rem,5vw,4rem)] font-bold text-coffee-mocha text-center break-words w-full font-handwritten"
        >
          " {{ date!.name }} "
        </h1>
        <div
          class="flex items-center justify-center w-full max-w-[450px] -mt-2"
        >
          <span
            class="text-blue-600 font-bold cursor-pointer text-[clamp(1.25rem,3vw,2rem)]"
            @click="copyDateCode"
            title="Click to copy date code"
          >
            #{{ date!.code }}
          </span>
        </div>
      </div>
      <div
        class="flex flex-col gap-4 w-full max-w-[450px] p-6 rounded shadow-md overflow-y-auto custom-scrollbar-thin max-h-[300px] sm:max-h-[350px]"
        :class="userHasSelectedDates ? 'bg-coffee-mocha' : 'bg-coffee-latte'"
      >
        <div>
          <h3
            :class="
              userHasSelectedDates ? 'text-coffee-foam' : 'text-coffee-mocha'
            "
          >
            {{ usersChosen.length > 1 ? "Dates in common" : "Possible dates" }}
          </h3>
          <template v-if="usersChosen.length > 0">
            <div v-if="Object.keys(groupedDates).length > 0">
              <div v-for="(dates, monthYear) in groupedDates" :key="monthYear">
                <h5
                  :class="
                    userHasSelectedDates
                      ? 'text-coffee-foam opacity-50'
                      : 'text-coffee-mocha opacity-50'
                  "
                  class="mt-4 mb-1"
                >
                  {{ monthYear }}
                </h5>
                <ul class="flex flex-col gap-1">
                  <li
                    v-for="date in dates"
                    :key="date"
                    title="Click to add to calendar"
                    class="flex items-center justify-between cursor-pointer transition-all sm:hover:opacity-75 relative"
                    :class="[
                      userHasSelectedDates
                        ? 'text-coffee-foam'
                        : 'text-coffee-mocha',
                      {
                        'font-bold':
                          allSelectedDatesWithCount.find((d) => d.date === date)
                            ?.count >= highestDateCount,
                      },
                      {
                        'bg-coffee-cappuccino !text-coffee-foam':
                          hoveredUserDates.includes(date),
                      },
                      selectedDates.includes(date) &&
                      !localSelectedDates.includes(date)
                        ? 'opacity-75 full-width-line-through'
                        : '',
                      userHasSelectedDates
                        ? 'line-coffee-foam'
                        : 'line-coffee-mocha',
                    ]"
                    @click="handleProposedDate(date)"
                  >
                    <div class="flex items-center gap-1 text-inherit">
                      {{ formatDate(date) }}
                      <Icon
                        v-if="
                          selectedDates.includes(date) ||
                          localSelectedDates.includes(date)
                        "
                        name="material-symbols:star-rounded"
                        :class="
                          userHasSelectedDates
                            ? 'text-coffee-foam'
                            : 'text-coffee-mocha'
                        "
                        title="You have selected this date"
                      />
                    </div>
                    ({{
                      allSelectedDatesWithCount.find((d) => d.date === date)
                        ?.count
                    }}
                    of {{ userCount }})
                  </li>
                </ul>
              </div>
            </div>
            <p
              v-if="usersChosen.length === 1"
              class="mt-4"
              :class="
                userHasSelectedDates ? 'text-coffee-foam' : 'text-coffee-mocha'
              "
            >
              These are only the dates proposed by the first user. Possible
              dates
              <span
                class="font-bold"
                :class="
                  userHasSelectedDates
                    ? 'text-coffee-foam'
                    : 'text-coffee-mocha'
                "
                >in common</span
              >
              will be shown, when more users enter their availability.
            </p>
            <p
              v-if="availableDates.length === 0 && usersChosen.length > 1"
              :class="
                userHasSelectedDates ? 'text-coffee-foam' : 'text-coffee-mocha'
              "
            >
              No dates in common.
              <span
                class="font-bold"
                :class="
                  userHasSelectedDates
                    ? 'text-coffee-foam'
                    : 'text-coffee-mocha'
                "
              >
                {{
                  usersNotChosen.length > 0
                    ? `${usersNotChosen.length} more needs to propose dates.`
                    : "Try harder!"
                }}</span
              >
            </p>
          </template>
          <p
            v-else
            :class="
              userHasSelectedDates ? 'text-coffee-foam' : 'text-coffee-mocha'
            "
          >
            No dates have been proposed yet.
          </p>
        </div>
        <div v-if="otherSelectedDates.length > 0 && usersChosen.length > 1">
          <h3
            :class="
              userHasSelectedDates ? 'text-coffee-foam' : 'text-coffee-mocha'
            "
          >
            Other proposed dates
          </h3>
          <div v-for="(dates, monthYear) in groupedOtherDates" :key="monthYear">
            <h5
              :class="
                userHasSelectedDates
                  ? 'text-coffee-foam opacity-50'
                  : 'text-coffee-mocha opacity-50'
              "
              class="mt-4 mb-1"
            >
              {{ monthYear }}
            </h5>
            <ul class="flex flex-col gap-1">
              <li
                v-for="date in dates"
                :key="date.date"
                title="Click to add to calendar"
                class="flex items-center justify-between cursor-pointer transition-all sm:hover:opacity-75 relative"
                :class="[
                  userHasSelectedDates
                    ? 'text-coffee-foam'
                    : 'text-coffee-mocha',
                  { 'font-bold': date.count >= highestDateCount },
                  { 'bg-blue-500': hoveredUserDates.includes(date.date) },
                  selectedDates.includes(date.date) &&
                  !localSelectedDates.includes(date.date)
                    ? 'opacity-75 full-width-line-through'
                    : '',
                  userHasSelectedDates
                    ? 'line-coffee-foam'
                    : 'line-coffee-mocha',
                ]"
                @click="handleProposedDate(date.date)"
              >
                <span
                  class="flex items-center gap-1"
                  :class="[
                    userHasSelectedDates
                      ? 'text-coffee-foam'
                      : 'text-coffee-mocha',
                    { 'font-bold': date.count >= highestDateCount },
                  ]"
                >
                  {{ formatDate(date.date) }}
                  <Icon
                    v-if="
                      selectedDates.includes(date.date) ||
                      localSelectedDates.includes(date.date)
                    "
                    name="material-symbols:star-rounded"
                    :class="
                      userHasSelectedDates
                        ? 'text-coffee-foam'
                        : 'text-coffee-mocha'
                    "
                    title="You have selected this date"
                  />
                </span>
                ({{ date.count }} of {{ userCount }})
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div
        class="flex flex-col gap-4 w-full max-w-[450px] p-6 rounded shadow-md"
        :class="userHasSelectedDates ? 'bg-coffee-latte' : 'bg-coffee-mocha'"
      >
        <div class="flex justify-center items-center gap-2">
          <h3
            class="text-2xl"
            :class="
              userHasSelectedDates ? 'text-coffee-mocha' : 'text-coffee-foam'
            "
          >
            Select dates
          </h3>
          <div
            v-if="
              selectedDates.length > 0 ||
              localSelectedDates.length > 0 ||
              previouslySelectedDates.length > 0
            "
            class="flex justify-center my-2"
          >
            <button
              @click="toggleAllDates"
              class="flex items-center text-coffee-foam transition-colors opacity-50 sm:hover:opacity-100"
            >
              <Icon
                :name="
                  isAllRemoved
                    ? 'material-symbols:settings-backup-restore'
                    : 'material-symbols:delete-sharp'
                "
                class="icon-size text-inherit"
              />
            </button>
          </div>
        </div>

        <p
          v-if="userProposedDatesCount === 1 && !showCalendar"
          :class="
            userHasSelectedDates ? 'text-coffee-mocha' : 'text-coffee-foam'
          "
        >
          You have proposed 1 date - are you sure you don't want to propose more
          dates for flexibility, {{ userStore.name }}?
        </p>
        <p
          v-else-if="userProposedDatesCount > 1 && !showCalendar"
          :class="
            userHasSelectedDates ? 'text-coffee-mocha' : 'text-coffee-foam'
          "
        >
          You have proposed some dates - good job, {{ userStore.name }}!
        </p>
        <p
          v-else-if="!showCalendar"
          :class="
            userHasSelectedDates ? 'text-coffee-mocha' : 'text-coffee-foam'
          "
        >
          You haven't proposed any dates yet, {{ userStore.name }}. Open the
          calendar to get started!
        </p>
        <p
          v-else-if="selectedDates.length !== localSelectedDates.length"
          :class="
            userHasSelectedDates ? 'text-coffee-mocha' : 'text-coffee-foam'
          "
        >
          <span
            v-if="
              selectedDates.length !== localSelectedDates.length &&
              userHasSelectedDates
            "
            class="text-inherit line-through decoration-2"
          >
            {{ selectedDates.length }}</span
          >
          {{
            `${localSelectedDates.length} ${
              localSelectedDates.length === 1 ? "date" : "dates"
            } selected. Remember to save ${
              localSelectedDates.length === 1
                ? "it"
                : localSelectedDates.length === 0
                ? ""
                : "them"
            } :)`
          }}
        </p>
        <p
          v-else
          :class="
            userHasSelectedDates ? 'text-coffee-mocha' : 'text-coffee-foam'
          "
        >
          Select and save dates to propose them to your friends!
        </p>
        <Calendar
          v-show="showCalendar"
          v-model="localSelectedDates"
          :proposedDates="allProposedDates"
          :userHasSelectedDates="userHasSelectedDates"
          :currentMonth="currentCalendarMonth"
          @dateToggled="handleDateToggled"
        />
        <div class="flex flex-col gap-2">
          <button
            v-if="showCalendar"
            @click="saveDates"
            class="py-3 px-6 font-bold rounded transition-colors sm:hover:bg-coffee-bean sm:hover:text-coffee-foam w-full"
            :class="
              userHasSelectedDates
                ? 'bg-coffee-mocha text-coffee-foam'
                : 'bg-coffee-foam text-coffee-mocha'
            "
          >
            Save Dates
          </button>
          <button
            @click="toggleCalendar"
            class="py-3 px-6 font-bold rounded transition-colors sm:hover:bg-coffee-bean sm:hover:text-coffee-foam w-full"
            :class="buttonClasses"
          >
            {{ showCalendar ? "Hide Calendar" : "Show Calendar" }}
          </button>
        </div>
      </div>
      <div
        class="w-full max-w-[450px] flex flex-col gap-2"
        ref="buttonContainerRef"
      >
        <button
          @click="leaveDate"
          class="w-full bg-coffee-latte py-3 px-6 font-bold rounded transition-colors"
          :class="
            !leaveDateConfirm
              ? 'bg-coffee-latte text-coffee-mocha'
              : 'bg-coffee-mocha text-coffee-latte'
          "
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
          class="w-full bg-red-600 py-3 px-6 text-coffee-foam font-bold rounded transition-colors sm:hover:bg-red-700"
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

<style scoped>
.full-width-line-through::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  border-top: 1px solid;
  transform: translateY(-50%);
}

.line-coffee-foam::before {
  border-color: theme("colors.coffee.foam");
}

.line-coffee-mocha::before {
  border-color: theme("colors.coffee.mocha");
}

.wide-line-through {
  position: relative;
}
.wide-line-through::after {
  content: "";
  position: absolute;
  left: -0.5em; /* Extend 0.5em to the left */
  right: -0.5em; /* Extend 0.5em to the right */
  top: 50%;
  border-top-width: 2px; /* Use Tailwind's decoration-2 thickness */
  border-top-style: solid;
  transform: translateY(-50%);
}
</style>
