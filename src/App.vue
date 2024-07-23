<template>
  <div id="app">
    <!-- <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link> |
      <router-link to="/contact">Contact</router-link>
    </nav> -->
    <router-view/>
  </div>
</template>

<style>
#app {
  width: 100%;
}
</style>

<script>
export default {
  name: 'App',
};
</script>
