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
        }}>Go to rule</button
      >
    </section>
  {:else}
    <section class="fade-in">
      <div>Rules:</div>
      <ol>
        <li>
          <p>To Do items are removed 30 days after being completed.</p>
        </li>
      </ol>
      <button class="buttonMargin"
        on:click={() => {
          page = "todos";
        }}>Go to back</button
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

<style>
  li {
    padding-top: 0.5rem;
    font-size: calc(11px + 0.5rem);
  }
</style>
