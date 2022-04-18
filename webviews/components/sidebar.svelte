<script lang="ts">
  import { onMount } from "svelte";
  import type { User } from "../types";
  import ToDos from "./ToDos.svelte";

  let accessToken = "";
  let loading = true;
  let user: User | null = null;
  let page: "todos" | "rules" = tsvscode.getState()?.page || "todos";

  $: {
    tsvscode.setState({ page });
  }

  onMount(async () => {
    window.addEventListener("message", async (event) => {
      const message = event.data; // The json data that the extension sent
      switch (message.type) {
        case "token":
          accessToken = message.value;
          const response = await fetch(`${apiBaseUrl}/me`, {
            headers: {
              authorization: `Bearer ${accessToken}`,
            },
          });
          const data = await response.json();
          user = data.users;
          loading = false;
          break;
      }
    });

    tsvscode.postMessage({ type: "get-token", value: undefined });
  });
</script>

<div>
  <h1>To Do List</h1>
</div>
{#if loading}
  <div>loading...</div>
{:else if user}
  {#if page === "todos"}
    <section class="fade-in">
      <ToDos {user} {accessToken} />
      <button class="buttonMargin"
        on:click={() => {
          page = "rules";
        }}>What can I do with ThingsToDo?</button
      >
    </section>
  {:else}
    <section class="fade-in">
      <div>Handy tips:</div>
      <ol type="1">
        <li>
          <p>Before you can add any Things To Do, you need to create a category. 
            To create a category just type the name into the 'Add Category' field press Enter
            This helps you keep yours Things To Do in manageable areas.</p>
        </li>
        <li>
          <p>If you are on a deadline, you can add a target date/time. 
            When it is 60 minutes before the target date, it will turn yellow.
            When it is 30 minutes before the target date, it will turn orange.
            When the target date/time has passed, it will turn red.<br />
            A target date/time is optional.</p>
        </li>
        <li>
          <p>When the extension is initially loaded the categories are collapsed.
            To expand on a section click on the category name. To collapse it just click it the same.</p>
        </li>
        <li>
          <p>To Do items are removed 30 days after being completed.</p>
        </li>
      </ol>
      <button class="buttonMargin"
        on:click={() => {
          page = "todos";
        }}>Go to my ThingsToDo</button
      >
    </section>
  {/if}
  <section class="fade-in">
    <button
      on:click={() => {
        accessToken = "";
        user = null;
        tsvscode.postMessage({ type: "logout", value: undefined });
      }}>Logout</button
    >
  </section>
{:else}
  <section class="fade-in">
    <button
      on:click={() => {
        tsvscode.postMessage({ type: "authenticate", value: undefined });
      }}>Login with GitHub</button
    >
  </section>
{/if}
