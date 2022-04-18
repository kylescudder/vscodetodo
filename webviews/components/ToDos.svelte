<script lang="ts">
  import { onMount } from "svelte";
  import { children } from "svelte/internal";
  import type { User } from "../types";
  import { apiBaseUrl } from "../../src/constants";
  import dayjs from 'dayjs'

  export let user: User;
  export let accessToken: string;
  let text = "";
  let targetDate = "";
  let categoryText = "";
  let todos: Array<{
    text: String;
    targetDate: Date;
    targetDateString: string;
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

  async function addToDo(t: string, targetDate: string, categorieId: number) {
    const response = await fetch(`${apiBaseUrl}/todo`, {
      method: "POST",
      body: JSON.stringify({
        text: t,
        targetDate: targetDate,
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
    todos.forEach(todo => {
      todo.targetDateString = dayjs(todo.targetDate).format('DD/MM/YYYY HH:mm')
    });
    categoryPopulate();
    return todos;
  }

  function categoryHide(event) {
    let target = event.target
    if (event.target.localName === 'i') {
      target = event.target.parentElement
    }

    if (target.nextElementSibling.style.maxHeight) {
      target.nextElementSibling.style.maxHeight = null;
      target.firstElementChild.classList.remove("expandedIcon");
    } else {
      target.nextElementSibling.style.maxHeight = target.nextElementSibling.scrollHeight + "px";
      target.firstElementChild.classList.add("expandedIcon");
    }
  }

  onMount(async () => {
    window.addEventListener("message", async (event) => {
      const message = event.data; // The json data that the extension sent
      switch (message.type) {
        case "new-todo":
          addToDo(message.value, '', selected);
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

<span class="grid grid-cols-4">
  <p class="text-lg col-span-3">Hello {user.name}</p>
  <i class="fa-solid fa-arrow-rotate-right col-span-1 text-lg float-right"
  on:click={() => {tsvscode.postMessage({ type: "refresh", value: undefined });}}></i>
</span>
<form
  on:submit|preventDefault={async () => {
    addToDo(text, targetDate, selected);
    text = "";
    targetDate = "";
  }}
>
  <input bind:value={text} placeholder="Add this todo" />
  <input bind:value={targetDate}  type="datetime-local" placeholder="Add target date" />
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
  <button type="submit">Add</button>
</form>
<form
  on:submit|preventDefault={async () => {
    addCategory(categoryText);
    categoryText = "";
  }}
  class="mt-4 mb-8"
>
  <input 
    bind:value={categoryText}
    class="fieldInput categoryDropdown"
    placeholder="Add category"
  />
</form>
<p class="text-lg">To Do List</p>
{#each categorie as categories (categories.id)}
  <section class="card">
    <h2 on:click={(event) => categoryHide(event)} class="categoryHeader text-2xl">
      {categories.text}<i class="fa-solid fa-arrow-right pl-2"></i>
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
