<script setup lang="ts">
const supabase = useSupabaseClient();
const dateName = ref("");
const dateId = ref("");
const currentDate = ref(null);
const userStore = useUserStore();
const userName = ref("");
const editName = ref(false);

// New reactive variables for user data
const userCount = ref(0);
const usersChosen = ref([]);
const usersNotChosen = ref([]);

onMounted(() => {
  // Load the username from the store
  userName.value = userStore.name;
});

async function saveName() {
  userStore.setName(userName.value);
  editName.value = false;
  console.log("Name saved:", userStore.name);
}

async function createDate() {
  if (!dateName.value || !userName.value) {
    console.log("Please enter your name and the name of the date :)");
    return;
  }
  try {
    // Create the date
    const { data, error } = await supabase
      .from("dates")
      .insert({ name: dateName.value })
      .select();
    if (error) throw error;
    if (!data || data.length === 0)
      throw new Error("No data returned after insert");
    // Add the creator to the availability table
    const { error: availabilityError } = await supabase
      .from("availability")
      .insert({
        date_id: data[0].id,
        user_name: userName.value,
        available_days: [], // Empty array for days
      });
    if (availabilityError) throw availabilityError;
    // Update local state
    userStore.setName(userName.value);
    currentDate.value = data[0];
    dateName.value = "";
  } catch (error) {
    console.error("Error creating date:", error);
    console.log(
      `Error creating date: ${
        error.message || "Unknown error"
      }. Please try again.`
    );
  }
}

async function joinDate() {
  if (!dateId.value || !userName.value) {
    console.log("Please enter a DATE ID and your name");
    return;
  }
  try {
    // First, check if the date exists
    const { data: dateData, error: dateError } = await supabase
      .from("dates")
      .select("*")
      .eq("code", dateId.value.toUpperCase())
      .single();
    if (dateError) throw dateError;
    if (!dateData) throw new Error("Invalid DATE ID");
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
    // If everything is successful, update the state
    userStore.setName(userName.value); // Store the username
    currentDate.value = dateData;
    dateId.value = "";
  } catch (error) {
    console.error("Error joining date:", error);
    console.log(
      `Error joining date: ${
        error.message || "Unknown error"
      }. Please try again.`
    );
  }
}

function leaveDate() {
  currentDate.value = null;
  // We don't clear the username here, so it persists for future use
}

// New function to update user data
function updateUserData(data) {
  userCount.value = data.userCount;
  usersChosen.value = data.usersChosen;
  usersNotChosen.value = data.usersNotChosen;
}
</script>

<template>
  <div class="grid sm:grid-cols-2 bg-coffee-foam min-h-[100dvh]">
    <div
      class="relative flex flex-col items-center justify-center bg-coffee-mocha"
    >
      <div class="text-center">
        <h1
          class="text-coffee-foam font-bold text-coffee-border-coffee-foam text-[3rem]"
        >
          Is it a date?
        </h1>
        <p
          v-if="userStore.name && !editName && !currentDate"
          class="text-coffee-foam"
        >
          Find out in no time,
          <span
            class="text-coffee-foam cursor-pointer font-bold"
            @click="editName = !editName"
            >{{ userStore.name }}</span
          >!
        </p>
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
          Save
        </button>
      </form>

      <div
        v-if="currentDate"
        class="flex flex-col gap-4 w-full max-w-[450px] p-4"
      >
        <div class="w-full">
          <h3 class="text-coffee-foam mb-2">
            {{ usersChosen.length }}/{{ userCount }} friend{{
              userCount !== 1 ? "s" : ""
            }}
            have proposed dates
          </h3>
          <div
            class="max-h-[200px] sm:max-h-[500px] sm:overflow-y-auto custom-scrollbar-alt"
          >
            <div
              v-for="user in usersChosen"
              class="flex items-center gap-1 text-coffee-foam font-bold mb-1"
            >
              <Icon
                class="text-coffee-foam text-[1.5rem]"
                name="mdi:check-bold"
              />
              {{ user }}
            </div>
            <div
              v-if="usersChosen.length > 0 && usersNotChosen.length > 0"
              class="w-full h-px bg-coffee-foam my-3"
            ></div>
            <div
              v-for="user in usersNotChosen"
              class="flex items-center gap-1 text-coffee-foam font-bold mb-1"
            >
              <Icon
                class="text-coffee-foam text-[1.5rem]"
                name="mdi:close-thick"
              />
              {{ user }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="!currentDate"
      class="flex flex-col items-center justify-center gap-4 p-4 w-full"
    >
      <div
        v-if="userStore.name"
        class="bg-coffee-mocha p-6 rounded shadow-md w-full max-w-[450px]"
      >
        <h2 class="text-2xl font-bold text-coffee-foam mb-4">
          Join a date room
        </h2>
        <form @submit.prevent="joinDate" class="flex flex-col gap-4">
          <input
            v-model="dateId"
            class="text-coffee-mocha py-3 px-6 rounded border-2 border-coffee-foam focus:outline-none focus:border-coffee-bean"
            type="text"
            placeholder="What is the ID of the date room?"
          />
          <button
            class="bg-coffee-foam py-3 px-6 text-coffee-mocha font-bold rounded transition-colors hover:bg-coffee-bean hover:text-coffee-foam"
          >
            Join
          </button>
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
        <h2 class="text-2xl font-bold text-coffee-mocha mb-4">
          Create a date room
        </h2>
        <form @submit.prevent="createDate" class="flex flex-col gap-4">
          <input
            v-model="dateName"
            class="text-coffee-mocha py-3 px-6 rounded border-2 border-coffee-foam focus:outline-none focus:border-coffee-bean"
            type="text"
            placeholder="What should we call your date room?"
          />
          <button
            class="bg-coffee-foam py-3 px-6 text-coffee-mocha font-bold rounded transition-colors hover:bg-coffee-bean hover:text-coffee-foam"
          >
            Create
          </button>
        </form>
      </div>
      <p class="text-coffee-mocha text-[1.5rem]" v-else>
        Enter and save your name to create or join a date room.
      </p>
    </div>
    <div v-if="currentDate" class="flex flex-col w-full h-full overflow-hidden">
      <DateRoom
        :date="currentDate"
        :user-name="userName"
        @leave-date="leaveDate"
        @update-user-data="updateUserData"
      />
    </div>
  </div>
</template>
