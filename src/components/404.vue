<template>
    <div class="full-screen">
        <main class="main-content">
            <h1>{{ $t('notFound.title') }}</h1>
            <p>{{ $t('notFound.body') }}</p>
            <router-link to="/" class="home-link">{{ $t('notFound.home') }}</router-link>
        </main>
    </div>
</template>

<script>
export default {
    name: 'NotFound'
}
</script>

<style scoped>
.full-screen {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
}
h1 { font-weight: 800; margin-bottom: 12px; }
p { color: #475569; margin-bottom: 24px; }
.home-link {
  display: inline-flex;
  background: #0A7AFF;
  color: #fff;
  text-decoration: none;
  font-weight: 700;
  border-radius: 999px;
  padding: 12px 22px;
}
</style>