<script setup lang="ts">
const supabase = useSupabaseClient();
const numberOfPeople = ref("");
const dateId = ref("");
const currentRoom = ref(null);
const userStore = useUserStore();
const userName = ref("");

onMounted(() => {
  // Load the username from the store
  userName.value = userStore.name;
});

async function createDate() {
  if (!numberOfPeople.value || !userName.value) {
    alert("Please enter the number of people and your name");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("dates")
      .insert({ name: `Date for ${numberOfPeople.value} people` })
      .select();

    if (error) throw error;

    if (data && data.length > 0) {
      userStore.setName(userName.value); // Store the username
      currentRoom.value = data[0];
      numberOfPeople.value = "";
    } else {
      throw new Error("No data returned after insert");
    }
  } catch (error) {
    console.error("Error creating date:", error);
    alert(
      `Error creating date: ${
        error.message || "Unknown error"
      }. Please try again.`
    );
  }
}

async function joinDate() {
  if (!dateId.value || !userName.value) {
    alert("Please enter a DATE ID and your name");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("dates")
      .select("*")
      .eq("code", dateId.value)
      .single();

    if (error) throw error;

    if (data) {
      userStore.setName(userName.value); // Store the username
      currentRoom.value = data;
      dateId.value = "";
    } else {
      throw new Error("Invalid DATE ID");
    }
  } catch (error) {
    console.error("Error joining date:", error);
    alert(
      `Error joining date: ${
        error.message || "Unknown error"
      }. Please try again.`
    );
  }
}

function leaveRoom() {
  currentRoom.value = null;
  // We don't clear the username here, so it persists for future use
}
</script>

<template>
  <div class="p-4 bg-yellow-100 min-h-screen">
    <div v-if="!currentRoom" class="flex flex-col gap-4 max-w-md mx-auto">
      <h1 class="text-4xl font-bold text-blue-800">Welcome!</h1>
      <p class="text-green-700">We'll get you hanging in no time :)</p>
      <input
        v-model="userName"
        class="py-2 px-4 rounded border-2 border-blue-500 focus:outline-none focus:border-blue-700"
        type="text"
        placeholder="Enter your name"
      />
      <div class="bg-green-400 p-6 rounded shadow-md">
        <h2 class="text-2xl font-bold text-white mb-4">Join a DATE</h2>
        <form @submit.prevent="joinDate" class="flex flex-col gap-3">
          <input
            v-model="dateId"
            class="py-2 px-4 rounded border-2 border-blue-500 focus:outline-none focus:border-blue-700"
            type="text"
            placeholder="Enter the DATE ID"
          />
          <button
            class="bg-blue-600 py-2 px-4 text-white font-bold rounded transition-colors hover:bg-blue-700"
          >
            Join
          </button>
        </form>
      </div>
      <div class="text-center text-xl font-bold text-blue-800">or</div>
      <div class="bg-orange-400 p-6 rounded shadow-md">
        <h2 class="text-2xl font-bold text-white mb-4">Create a DATE</h2>
        <form @submit.prevent="createDate" class="flex flex-col gap-3">
          <input
            v-model="numberOfPeople"
            class="py-2 px-4 rounded border-2 border-blue-500 focus:outline-none focus:border-blue-700"
            type="number"
            placeholder="Enter the number of people"
          />
          <button
            class="bg-blue-600 py-2 px-4 text-white font-bold rounded transition-colors hover:bg-blue-700"
          >
            Create
          </button>
        </form>
      </div>
    </div>
    <DateRoom
      v-if="currentRoom"
      :room="currentRoom"
      :user-name="userName"
      @leave-room="leaveRoom"
    />
  </div>
</template>
