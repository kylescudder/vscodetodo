<script lang='ts'>
  import { onMount } from 'svelte';
  import { children } from 'svelte/internal';
  import type { User } from '../types';
  import { apiBaseUrl } from '../../src/constants';

  export let user: User;
  export let accessToken: string;
  let text = '';
  let todos: Array<{
    text: String;
    completed: boolean;
    id: number;
    categorieText: string;
  }> = [];
  let selected: number;
  let answer = '';
  let categorie: Array<{
    id: number;
    text: string;
    randomColour: string;
  }> = [];

  async function addToDo(t: string, categorieText: string) {
    const response = await fetch(`${apiBaseUrl}/todo`, {
      method: 'POST',
      body: JSON.stringify({
        text: t,
        categorieText: categorieText,
      }),
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
    });
    getToDo()
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
    return todos
  }

  onMount(async () => {
    window.addEventListener('message', async (event) => {
      const message = event.data; // The json data that the extension sent
      switch (message.type) {
        case 'new-todo':
          addToDo(message.value, selected.toString());
          break;
      }
    });
    getToDo()
    .then(() => {
    })
    .catch(() => {
      console.log('Getting todos failed')
    })

    const categorieResponse = await fetch(`${apiBaseUrl}/categories`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    const categoriePayload = await categorieResponse.json();
    categorie = categoriePayload.payload;
    selected = categorie[0].text
    setTimeout(function () {
      hideEmptyCategories();
    }, 100);
  });


function hideEmptyCategories() {
  var arr=Array.from(document.getElementsByClassName('card'));
  for(let i=0;i<arr.length;i++) {
    const element=arr[i];
    const lists=element.children[1];
    if(lists.childElementCount==0) {
      element.removeAttribute('style');
      element.setAttribute('style','display: none;');
    } else {
      element.removeAttribute('style');
      element.setAttribute('style','display: block;');
    }
  }
}
</script>

<div>Hello {user.name}</div>
<form
  on:submit|preventDefault={async () => {
    addToDo(text, selected.toString());
    text = '';
  }}
>
  <input bind:value={text} class="fieldInput" placeholder="Add this todo" />
  <select
    bind:value={selected}
    on:blur={() => (answer = "")}
    class="fieldInput categoryDropdown"
  >
    {#each categorie as categories}
      <option value={categories.text}>
        {categories.text}
      </option>
    {/each}
  </select>
</form>
{#each categorie as categories (categories.id)}
  <div class="card">
    <h2 on:click={(event) => categoryHide(event)}>{categories.text} > </h2>
    <ul class="collapsed">
      {#each todos as todo (todo.id)}
        {#if categories.text === todo.categorieText}
          <li
            class:completed={todo.completed}
            on:click={async () => {
              todo.completed = !todo.completed;
              const response = await fetch(`${apiBaseUrl}/todo`, {
                method: 'PUT',
                body: JSON.stringify({
                  id: todo.id,
                }),
                headers: {
                  'content-type': 'application/json',
                  authorization: `Bearer ${accessToken}`,
                },
              });
              getToDo()
              .then(() => {
              })
              .catch(() => {
                console.log('Getting todos failed')
              })
              if (todo.completed) {
                tsvscode.postMessage({
                  type: 'onInfo',
                  value: todo.text + ' completed! Well done 🥳',
                });
              }
              const payload = await response.json();
              todos = payload.todos;
            }}
          >
            {todo.text}
          </li>
        {/if}
      {/each}
    </ul>
  </div>
{/each}

<style>
  .completed {
    text-decoration: line-through;
    color: rgba(255, 255, 255, 0.5);
  }
  li {
    padding-top: 0.5rem;
    font-size: calc(11px + 0.5rem);
  }
</style>
