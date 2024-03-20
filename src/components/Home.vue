<template>
  <div class="full-screen">
  <header class="header">
      <div class="logo">
        <!-- <img src="small-logo.png" alt="logo"> -->
        <img src = "/logo-small.svg" alt="My Happy SVG"/>
        Anki Flashcards
      </div>
  </header>
  <main class="main-content">
    <h1>Learn faster.<br>Improve your memory.</h1>
    <p>Use the simplest and most effective flashcard app</p>
    <a href="https://apps.apple.com/in/app/anki-flashcards-study-decks/id6443485322" target="_blank" style="text-decoration: none;">
      <button>Download the app</button>
    </a>
  </main>
  </div>
</template>

<style>
body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  background: #EFF6FF !important;
  font-family: -apple-system,"Helvetica Neue",Roboto,"Noto Sans","Liberation Sans",Helvetica,Arial,sans-serif
}

.container-xxl {
  /* height: 100%; */
  background: #ffffff;
  box-shadow: 0 6px 20px 0 #CBD5E1;
}

.full-screen {
    width: 100%;
    min-height: 100vh; /* 100% of the viewport height */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 50px 0;
}

.header .logo {
  font-size: 1.75em;
  color: #007bff;
  margin-bottom: 30px;
  font-weight: 300;
}

.header img {
  margin-right: 20px;
}

.main-content {
  text-align: center;
}

.main-content h1 {
  color: #1E293D;
  font-size: 4.5em;
  margin: 0 24px;
  font-weight: 700;
}

.main-content p {
  font-size: 1.8em;
  font-weight: 200;
  margin: 32px 12px 50px;
  color: #475569; 
}

button {
  font-size: 1.5em !important;
  font-weight: 300;
  background-color: #0A7AFF;
  color: white;
  border: none;
  padding: 15px 30px;
  cursor: pointer;
  border-radius: 50px !important;
  font-size: 16px;
  outline: none;
}

button:hover {
  background-color: #0056b3; /* Darker shade for hover effect */
}

@media (max-width: 576px) {
  .header .logo {
    font-size: 1.6em;
    color: #007bff;
    margin-bottom: 24px;
  }
  .main-content h1 {
    font-size: 3.2em;
    margin: 0 12px;
  }
  .main-content p {
    font-size: 1.75em;
    font-weight: 300; 
    margin: 24px 0 34px;
  }
  button {
    font-size: 1.3em !important;
    font-weight: 500;
  }
}
</style>

<script>
export default {
  name: 'HomePage',
};
</script>