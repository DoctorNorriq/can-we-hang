<script setup lang="ts">
const supabase = useSupabaseClient();
const dateName = ref("");
const dateId = ref("");
const currentDate = ref(null);
const userStore = useUserStore();
const userName = ref("");
const editName = ref(false);
const isLoading = ref<boolean | string>(false);
const showError = ref<boolean | string>(false);
const errorMessage = ref("");

// New reactive variables for user data
const userCount = ref(0);
const usersChosen = ref([]);
const usersNotChosen = ref([]);

async function saveName() {
  userStore.setName(userName.value.trim());
  editName.value = false;
  console.log("Name saved:", userStore.name);

  if (pendingRoomCode.value) {
    dateId.value = pendingRoomCode.value;
    await joinDate();
    pendingRoomCode.value = null;
  }
}

async function createDate() {
  if (!dateName.value.trim()) {
    showError.value = "create";
    errorMessage.value = "Please enter a name for your date room.";
    return;
  }
  if (!userName.value.trim()) {
    showError.value = "create";
    errorMessage.value = "Please enter your name before creating a date room.";
    return;
  }

  isLoading.value = "create";
  showError.value = false;
  errorMessage.value = "";

  try {
    const { data, error } = await supabase
      .from("dates")
      .insert({ name: dateName.value.trim() })
      .select();
    if (error) throw error;
    if (!data || data.length === 0)
      throw new Error("No data returned after insert");

    const { error: availabilityError } = await supabase
      .from("availability")
      .insert({
        date_id: data[0].id,
        user_name: userName.value.trim(),
        available_days: [],
      });
    if (availabilityError) throw availabilityError;

    userStore.setName(userName.value.trim());
    currentDate.value = data[0];
    dateName.value = "";
    pendingRoomCode.value = "";
  } catch (error) {
    console.error("Error creating date:", error);
    showError.value = "create";
    errorMessage.value =
      "Oops! We couldn't create your date room. Please try again later.";
  } finally {
    isLoading.value = false;
  }
}

async function joinDate() {
  if (!dateId.value.trim()) {
    showError.value = "join";
    errorMessage.value =
      "Please enter the ID of the date room you want to join.";
    return;
  }

  if (!userStore.name) {
    pendingRoomCode.value = dateId.value;
    editName.value = true;
    return;
  }

  if (!userName.value.trim()) {
    showError.value = "join";
    errorMessage.value = "Please enter your name before joining a date room.";
    editName.value = true;
    return;
  }

  isLoading.value = "join";
  showError.value = false;
  errorMessage.value = "";

  try {
    const { data: dateData, error: dateError } = await supabase
      .from("dates")
      .select("*")
      .eq("code", dateId.value.trim().toUpperCase())
      .single();

    if (dateError) throw new Error("Invalid DATE ID");
    if (!dateData) throw new Error("Date room not found");
    // Check if the user already has an entry for this date
    const { data: existingEntry, error: existingEntryError } = await supabase
      .from("availability")
      .select("*")
      .eq("date_id", dateData.id)
      .eq("user_name", userName.value)
      .single();
    if (existingEntryError && existingEntryError.code !== "PGRST116") {
      throw existingEntryError;
    }
    if (existingEntry) {
      if (!existingEntry.is_active) {
        // If the entry exists but is not active (was abandoned), reactivate it with empty available_days
        const { error: updateError } = await supabase
          .from("availability")
          .update({ is_active: true, available_days: [] })
          .eq("id", existingEntry.id);
        if (updateError) throw updateError;
      } else {
        // If the entry is active, just ensure it's active (in case of any inconsistencies)
        const { error: updateError } = await supabase
          .from("availability")
          .update({ is_active: true })
          .eq("id", existingEntry.id);
        if (updateError) throw updateError;
      }
    } else {
      // If the user doesn't have an entry, create a new one
      const { error: insertError } = await supabase
        .from("availability")
        .insert({
          date_id: dateData.id,
          user_name: userName.value,
          available_days: [],
          is_active: true,
        });
      if (insertError) throw insertError;
    }
    userStore.setName(userName.value.trim());
    currentDate.value = dateData;
    pendingRoomCode.value = "";
    dateId.value = "";
  } catch (error) {
    console.error("Error joining date:", error);
    showError.value = "join";
    if (
      error.message === "Invalid DATE ID" ||
      error.message === "Date room not found"
    ) {
      errorMessage.value =
        "We couldn't find that date room. Please check the ID and try again.";
    } else {
      errorMessage.value =
        "Oops! We couldn't join the date room. Please try again later.";
    }
  } finally {
    isLoading.value = false;
  }
}

function leaveDate() {
  currentDate.value = null;
  // We don't clear the username here, so it persists for future use
}

// New function to update user data
function updateUserData(data) {
  userCount.value = data.userCount;
  usersChosen.value = data.usersChosen.map((user) => ({
    name: user.name,
    dateCount: user.dateCount,
  }));
  usersNotChosen.value = data.usersNotChosen.map((user) => ({
    name: user.name,
    dateCount: 0,
  }));
}
const hoveredUser = ref<string | null>(null);

const updateHoveredUser = (user: string | null) => {
  hoveredUser.value = user;
};

const resetShowError = () => {
  if (showError.value !== false) {
    showError.value = false;
  }
};

const pendingRoomCode = ref<string | null>(null);

onMounted(async () => {
  userName.value = userStore.name;
  const route = useRoute();
  const code = route.query.code;
  if (code && typeof code === "string") {
    pendingRoomCode.value = code;
  }
});
</script>

<template>
  <div class="grid sm:grid-cols-2 bg-coffee-foam min-h-[100dvh] sm:h-[100dvh]">
    <div
      class="relative flex flex-col items-center justify-center bg-coffee-mocha p-4"
    >
      <div>
        <h1
          class="text-coffee-foam font-bold text-coffee-border-coffee-foam text-[clamp(2rem,5vw,4rem)]"
        >
          Is it a date?
        </h1>

        <p
          v-if="userStore.name && !editName && !currentDate"
          class="text-coffee-foam mb-4"
        >
          Find out in no time,
          <span
            class="text-coffee-foam cursor-pointer font-bold"
            @click="editName = !editName"
            >{{ userStore.name }}</span
          >!
        </p>
        <div
          v-if="currentDate"
          class="flex flex-col gap-4 w-full max-w-[450px]"
        >
          <div class="w-full">
            <h3 class="text-coffee-foam mb-2">
              {{ usersChosen.length }}/{{ userCount }}
              have proposed dates
            </h3>
            <div
              class="max-h-[200px] sm:max-h-[500px] sm:overflow-y-auto custom-scrollbar"
            >
              <div
                v-for="user in usersChosen"
                :key="user.name"
                class="flex items-center justify-between text-coffee-foam font-bold cursor-pointer mb-1 font-handwritten text-[1.5rem] w-full"
                @mouseover="updateHoveredUser(user.name)"
                @mouseleave="updateHoveredUser(null)"
                :class="{ '!text-coffee-latte': hoveredUser === user.name }"
              >
                <div class="flex items-center gap-1">
                  <Icon
                    class="text-coffee-foam text-[1.5rem]"
                    name="mdi:check-bold"
                  />
                  {{ user.name }}
                  ({{ user.dateCount }} dates)
                  <Icon
                    v-if="user.name === userName"
                    name="material-symbols:star-rounded"
                    class="text-accent-gold text-[1.5rem]"
                    title="You have selected this date"
                  />
                </div>
              </div>
              <!-- ... rest of the code for usersNotChosen ... -->
            </div>
          </div>
        </div>
      </div>

      <form
        v-if="!userStore.name || editName"
        class="flex flex-col gap-4 p-4 w-full max-w-[450px]"
        @submit.prevent="saveName"
      >
        <input
          v-model="userName"
          class="text-coffee-mocha py-3 px-6 rounded border-2 border-coffee-foam focus:outline-none focus:border-coffee-bean"
          type="text"
          placeholder="What should we call you?"
        />
        <button
          class="bg-coffee-foam py-3 px-6 text-coffee-mocha font-bold rounded transition-colors hover:bg-coffee-bean hover:text-coffee-foam"
        >
          {{
            pendingRoomCode ? `Save & join room #${pendingRoomCode}` : "Save"
          }}
        </button>
      </form>
    </div>
    <div
      v-if="!currentDate"
      class="flex flex-col items-center justify-center gap-4 p-4 w-full"
    >
      <div
        v-if="userStore.name"
        class="bg-coffee-mocha p-6 rounded shadow-md w-full max-w-[450px]"
      >
        <div class="flex items-center gap-2 mb-4 text-coffee-foam">
          <h2 class="text-2xl font-bold text-inherit">Join a date room</h2>
          <CommonLoadingSpinner v-if="isLoading === 'join'" />
        </div>
        <form @submit.prevent="joinDate" class="flex flex-col gap-4">
          <input
            v-model="dateId"
            @input="resetShowError"
            class="text-coffee-mocha py-3 px-6 rounded border-2 border-coffee-foam focus:outline-none focus:border-coffee-bean"
            type="text"
            placeholder="Enter ID of the date room"
          />
          <button
            class="bg-coffee-foam py-3 px-6 text-coffee-mocha border-2 sm:hover:border-coffee-bean font-bold rounded transition-colors sm:hover:bg-coffee-bean hover:text-coffee-foam"
          >
            Join
          </button>
          <div v-if="showError === 'join'" class="flex items-start gap-2">
            <Icon
              name="material-symbols:heart-broken-rounded"
              class="text-2xl text-inherit"
            />
            <p class="text-inherit">{{ errorMessage }}</p>
          </div>
        </form>
      </div>
      <span
        v-if="userStore.name"
        class="text-center text-coffee-mocha text-xl font-bold text-coffee-border-coffee-foam"
      >
        or
      </span>
      <div
        v-if="userStore.name"
        class="bg-coffee-latte p-6 rounded shadow-md w-full max-w-[450px]"
      >
        <div class="flex items-center gap-2 mb-4 text-coffee-mocha">
          <h2 class="text-2xl font-bold text-inherit">Create a date</h2>
          <CommonLoadingSpinner v-if="isLoading === 'create'" />
        </div>
        <form @submit.prevent="createDate" class="flex flex-col gap-4">
          <input
            v-model="dateName"
            @input="resetShowError"
            class="text-coffee-mocha py-3 px-6 rounded border-2 border-coffee-foam focus:outline-none focus:border-coffee-bean"
            type="text"
            placeholder="Date name?"
          />
          <button
            class="bg-coffee-mocha py-3 px-6 text-coffee-foam border-2 border-coffee-mocha sm:hover:border-coffee-bean font-bold rounded transition-colors hover:bg-coffee-bean hover:text-coffee-foam"
          >
            Create
          </button>
          <div
            v-if="showError === 'create'"
            class="flex items-start gap-2 text-coffee-mocha"
          >
            <Icon
              name="material-symbols:heart-broken-rounded"
              class="text-2xl text-inherit"
            />
            <p class="text-inherit">{{ errorMessage }}</p>
          </div>
        </form>
      </div>
      <div class="flex flex-col items-center gap-2" v-else>
        <div class="sm:-rotate-90 sm:order-2">
          <Icon
            name="ph:arrow-fat-up-fill"
            class="text-coffee-mocha text-[4rem] animate-bounce"
          />
        </div>
        <p class="text-coffee-mocha text-[1.25rem] text-center">
          {{
            pendingRoomCode
              ? `Enter and save your name, to gain access to room #${pendingRoomCode}!`
              : "Enter and save your name, to gain access to everything!"
          }}
        </p>
      </div>
    </div>
    <div v-if="currentDate" class="flex flex-col w-full h-full overflow-hidden">
      <DateRoom
        :date="currentDate"
        :user-name="userName"
        :hovered-user="hoveredUser"
        @leave-date="leaveDate"
        @update-user-data="updateUserData"
      />
    </div>
  </div>
</template>
