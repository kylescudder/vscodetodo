<script lang="ts">
  import { onMount } from "svelte";
  import { children } from "svelte/internal";
  import type { User } from "../types";
  import { apiBaseUrl } from "../../src/constants";

  export let user: User;
  export let accessToken: string;
  let text = '';
  let categoryText = '';
  let todos: Array<{
    text: String;
    completed: boolean;
    id: number;
    categorieId: number;
  }> = [];
  let selected: number;
  let answer = "";
  let categorie: Array<{
    id: number;
    text: string;
    randomColour: string;
  }> = [];

  async function addToDo(t: string, categorieId: number) {
    const response = await fetch(`${apiBaseUrl}/todo`, {
      method: "POST",
      body: JSON.stringify({
        text: t,
        categorieId: categorieId,
      }),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
    });
    getToDo()
      .then(() => {})
      .catch(() => {
        console.log("Getting todos failed");
      });
    setTimeout(function () {
      hideEmptyCategories();
    }, 100);
  }
  async function addCategory(t: string) {
    const response = await fetch(`${apiBaseUrl}/category`, {
      method: 'POST',
      body: JSON.stringify({
        categorieText: t,
      }),
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
    });
    categoryPopulate()    
    .then(() => {
    })
    .catch(() => {
      console.log('Getting todos failed')
    })
    setTimeout(function () {
      hideEmptyCategories();
    }, 100);
  }

  async function getToDo() {
    const response = await fetch(`${apiBaseUrl}/todo`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = await response.json();
    todos = payload.data;
    return todos;
  }

  function categoryHide(event) {
    if (!event.target.nextElementSibling.classList.contains("collapsed")) {
      event.target.nextElementSibling.classList.add("collapsed");
      event.target.firstElementChild.classList.remove("expanded");
    } else {
      event.target.nextElementSibling.classList.remove("collapsed");
      event.target.firstElementChild.classList.add("expanded");
    }
  }

  onMount(async () => {
    window.addEventListener("message", async (event) => {
      const message = event.data; // The json data that the extension sent
      switch (message.type) {
        case "new-todo":
          addToDo(message.value, selected);
          break;
      }
    });
    getToDo()
      .then(() => {})
      .catch(() => {
        console.log("Getting todos failed");
      });
    categoryPopulate()
  });
  async function categoryPopulate() {
    const categorieResponse = await fetch(`${apiBaseUrl}/categories`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    const categoriePayload = await categorieResponse.json();
    categorie = categoriePayload.payload;
    selected = categorie[0].id;
    setTimeout(function () {
      hideEmptyCategories();
    }, 100);
  }
  function hideEmptyCategories() {
    var arr = Array.from(document.getElementsByClassName("card"));
    for (let i = 0; i < arr.length; i++) {
      const element = arr[i];
      const lists = element.children[1];
      if (lists.childElementCount == 0) {
        element.removeAttribute("style");
        element.setAttribute("style", "display: none;");
      } else {
        element.removeAttribute("style");
        element.setAttribute("style", "display: block;");
      }
    }
  }
  async function clickToDo(todo) {
    todo.completed = !todo.completed;
    const response = await fetch(`${apiBaseUrl}/todo`, {
      method: "PUT",
      body: JSON.stringify({
        id: todo.id,
      }),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
    });
    getToDo()
      .then(() => {})
      .catch(() => {
        console.log("Getting todos failed");
      });
    if (todo.completed) {
      tsvscode.postMessage({
        type: "onInfo",
        value: todo.text + " completed! Well done 🥳",
      });
    }
    const payload = await response.json();
    todos = payload.todos;
  }
</script>

<div>Hello {user.name}</div>
<form
  on:submit|preventDefault={async () => {
    addToDo(text, selected);
    text = "";
  }}
>
  <input bind:value={text}
  class="fieldInput" placeholder="Add this todo" />
  <select
    bind:value={selected}
    on:blur={() => (answer = "")}
    class="fieldInput categoryDropdown"
  >
    {#each categorie as categories}
      <option value={categories.id}>
        {categories.text}
      </option>
    {/each}
  </select>
</form>
<form
  on:submit|preventDefault={async () => {
    addCategory(categoryText);
    categoryText = "";
  }}
>
  <input 
    bind:value={categoryText}
    class="fieldInput categoryDropdown"
    placeholder="Add category"
  />
</form>
{#each categorie as categories (categories.id)}
    <h2 on:click={(event) => categoryHide(event)}>
      {categories.text}<span id="colIcon">&gt;</span>
  <section class="card">
    </h2>
    <div class="panel">
      {#each todos as todo (todo.id)}
        {#if categories.id === todo.categorieId}
          <article
            class="todoArticle pt-2 text-base grid grid-cols-6"
            on:click={clickToDo(todo)}
            >
            <span class="col-span-5 grid grid-cols-4"
              class:completed={todo.completed}
              class:uncompleted={!todo.completed}
            >
              <span class="todoText col-span-2">
                {todo.text}
              </span>
              <span class="col-span-2">
                 {todo.targetDateString}
              </span>
            </span>
            <span class="todoImg col-span-1">
              {#if todo.completed}
                <i class="fa-solid fa-circle-check ml-3 checkedIcon text-2xl"></i>
              {:else}
                <i class="fa-regular fa-circle-check ml-3 checkedIcon text-2xl"></i>
              {/if}
            </span>
          </article>
        {/if}
      {/each}
    </div>
  </section>
{/each}

<style>

</style>
