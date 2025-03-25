import svelte from 'rollup-plugin-svelte';

export default {
  plugins: [
    svelte({
      compilerOptions: {
        compatibility: {
          componentApi: 4, // This ensures the old component API is used
        }
      }
    })
  ]
};
