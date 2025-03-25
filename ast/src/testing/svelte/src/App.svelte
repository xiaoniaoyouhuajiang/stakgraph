<script>
  import Log from './Log.svelte';
</script>

<main>
  <header>
    <img src="/favicon.png" alt="Logo" class="logo" />
  </header>
  <Log />
</main>

<style>
  main {
    font-family: Arial, sans-serif;
    max-width: 600px;
    margin: auto;
    padding: 2rem;
    background-color: #f4f4f4;
    border-radius: 10px;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .logo {
    height: 345px	; /* Adjust height as needed */
    width: auto;
  }

  h1 {
    margin: 0;
  }
</style>
