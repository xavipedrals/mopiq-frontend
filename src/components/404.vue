<template>
    <div class="full-screen container-xxl">
        <main class="main-content">
            <h1>404 - Page Not Found</h1>
            <p>The page you are looking for does not exist.</p>
            <router-link to="/">
                <button>Go home</button>
            </router-link>
        </main>
    </div>
</template>

<script>
export default {
    name: 'NotFound'
}
</script>

<style>
/* Style your 404 page here */
</style>